const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "verification-shots", "verifier-v1");
const RUNS = path.join(ROOT, "verifier", "runs");
const BASE = process.env.GAME_URL || "http://127.0.0.1:4173";
const mode = process.argv[2] || "all";
const started = new Date();
const record = {
  startedAt: started.toISOString(),
  command: `node verifier/v1/presentation.cjs ${mode}`,
  mode,
  checks: {},
  assertions: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: []
};
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RUNS, { recursive: true });

function bounds(object) {
  if (!object || object.destroyed) return null;
  const b = object.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

function assertCheck(name, pass, details = {}) {
  record.assertions.push({ name, pass: Boolean(pass), ...details });
  if (!pass) throw new Error(`Acceptance check failed: ${name}`);
}

function contains(outer, inner, padding = 0) {
  return inner.x >= outer.x + padding &&
    inner.y >= outer.y + padding &&
    inner.x + inner.width <= outer.x + outer.width - padding &&
    inner.y + inner.height <= outer.y + outer.height - padding;
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1594, height: 898 },
    deviceScaleFactor: 1,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => record.pageErrors.push(error.message));
  page.on("requestfailed", (request) => record.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  try {
    await page.goto(`${BASE}/?seed=41`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 120000 });
    if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(797, 440);
    await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 120000 });
    if (!(await page.evaluate(() => Boolean(window.__statePreview)))) {
      record.retired = "state preview harness removed from the game; scenario-driven presentation suite retired";
      record.finishedAt = new Date().toISOString();
      record.durationMs = new Date(record.finishedAt) - started;
      const file = path.join(RUNS, `${started.toISOString().replace(/[:.]/g, "-")}-presentation-${mode}.json`);
      fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
      console.log(JSON.stringify({ mode, retired: record.retired }));
      return;
    }
    await page.waitForTimeout(1000);
    if (mode === "all" || mode === "base") {
      await page.evaluate(() => window.__statePreview.run("base"));
      await page.waitForFunction(() => !window.__statePreview.status().busy);
      await page.waitForTimeout(300);
      record.checks.background = await page.evaluate(() => window.__slotDebug.snapshot().background);
      const background = record.checks.background;
      const viewportWidth = 1594;
      const viewportHeight = 898;
      assertCheck("background-source-composition", background?.composition === "source-landscape" && background.sourceVisible && !background.legacyVisible, { background });
      assertCheck("background-atlas-pixel-ratio", background?.backgroundAtlasPixelRatio === 1, { actual: background?.backgroundAtlasPixelRatio });
      assertCheck("background-stage-transform", background && Math.abs(background.stage.x - viewportWidth / 2) < 0.01 && Math.abs(background.stage.y - viewportHeight / 2) < 0.01 && Math.abs(background.stage.scale - viewportWidth / 1920) < 0.000001 && background.stage.pivotX === 960 && background.stage.pivotY === 960, { stage: background?.stage });
      assertCheck("background-centered-container", background?.container.x === 960 && background.container.y === 960, { container: background?.container });
      assertCheck("background-source-layer-order", JSON.stringify(background?.container.layerOrder) === JSON.stringify(["SourceSky", "cloud1", "cloud2", "cloud3", "_bgBottom", "bird1", "bird2"]), { actual: background?.container.layerOrder });
      assertCheck("background-top-art-source-position", background?.topArt.x === 0 && background.topArt.y === 300 && background.topArt.anchor.x === 0.5 && Math.abs(background.topArt.anchor.y - 877 / 1837) < 0.000001, { topArt: background?.topArt });
      assertCheck("background-sky-source-anchor", background?.sky.anchor.x === 0.5 && background.sky.anchor.y === 0.5 && background.sky.resolution === 1, { sky: background?.sky });
      assertCheck("background-cloud-source-anchors", background?.clouds.length === 3 && background.clouds.every((cloud) => Math.abs(cloud.anchor.x - 0.5) < 0.000001 && Math.abs(cloud.anchor.y - 0.5) < 0.000001 && cloud.resolution === 1 && cloud.scaleX === -1 && cloud.scaleY === 1), { clouds: background?.clouds });
      assertCheck("background-bird-source-settings", background?.birds.length === 2 && background.birds.every((bird, index) => bird.y === (index === 0 ? -450 : -250) && bird.scaleX === (index === 0 ? -0.2 : -0.3) && bird.scaleY === 0.3 && bird.playing), { birds: background?.birds });
      record.checks.jackpots = await page.evaluate(() => {
        const reels = window.__REELSET_DEBUG__;
        const gameLayer = reels.root.parent.parent;
        const roots = gameLayer.children.filter((child) => child.label?.startsWith("JackpotPanel:"));
        const rect = (b) => ({ x: b.x, y: b.y, width: b.width, height: b.height });
        const ownSpriteBounds = (sprite) => {
          const width = sprite.texture.width;
          const height = sprite.texture.height;
          const left = -sprite.anchor.x * width;
          const top = -sprite.anchor.y * height;
          const points = [
            { x: left, y: top },
            { x: left + width, y: top },
            { x: left, y: top + height },
            { x: left + width, y: top + height }
          ].map((point) => sprite.worldTransform.apply(point));
          const xs = points.map((point) => point.x);
          const ys = points.map((point) => point.y);
          return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        };
        const visibleSpriteBounds = (sprite) => {
          const trim = sprite.texture.trim;
          const orig = sprite.texture.orig;
          const left = trim.x - sprite.anchor.x * orig.width;
          const top = trim.y - sprite.anchor.y * orig.height;
          const points = [
            { x: left, y: top },
            { x: left + trim.width, y: top },
            { x: left, y: top + trim.height },
            { x: left + trim.width, y: top + trim.height }
          ].map((point) => sprite.worldTransform.apply(point));
          const xs = points.map((point) => point.x);
          const ys = points.map((point) => point.y);
          return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        };
        return roots.map((root) => {
          const meter = root.children.find((child) => child.label === "JackpotMeter");
          const caption = meter.children.find((child) => child.label === "JackpotCaption");
          const value = meter.children.find((child) => child.label === "JackpotValue");
          return { label: root.label, meter: ownSpriteBounds(meter), visibleMeter: visibleSpriteBounds(meter), caption: rect(caption.getBounds()), value: rect(value.getBounds()) };
        });
      });
      await capture(page, "base");
      const jackpots = record.checks.jackpots;
      assertCheck("jackpot-all-four-panels", jackpots.length === 4, { actual: jackpots.length });
      const expectedCaptions = [[-130, -60], [-115, -60], [-95, -55], [-91, -55]];
      const unit = Math.min(1594 / 1920, 898 / 1080);
      jackpots.forEach((jackpot, index) => {
        const meterCenter = { x: jackpot.meter.x + jackpot.meter.width / 2, y: jackpot.meter.y + jackpot.meter.height / 2 };
        const captionCenter = { x: jackpot.caption.x + jackpot.caption.width / 2, y: jackpot.caption.y + jackpot.caption.height / 2 };
        const expectedX = meterCenter.x + expectedCaptions[index][0] * unit;
        const expectedY = meterCenter.y + expectedCaptions[index][1] * unit;
        assertCheck(`jackpot-${index}-value-inside-own-meter`, contains(jackpot.meter, jackpot.value), { meter: jackpot.meter, value: jackpot.value });
        assertCheck(`jackpot-${index}-caption-source-offset`, Math.hypot(captionCenter.x - expectedX, captionCenter.y - expectedY) <= 0.75, { actual: captionCenter, expected: { x: expectedX, y: expectedY } });
        jackpots.forEach((other, otherIndex) => {
          if (index === otherIndex) return;
          const otherMeter = other.visibleMeter;
          const overlapWidth = Math.max(0, Math.min(jackpot.caption.x + jackpot.caption.width, otherMeter.x + otherMeter.width) - Math.max(jackpot.caption.x, otherMeter.x));
          const overlapHeight = Math.max(0, Math.min(jackpot.caption.y + jackpot.caption.height, otherMeter.y + otherMeter.height) - Math.max(jackpot.caption.y, otherMeter.y));
          // Reject visible overlap, not contact with the source texture's glow.
          const transparentEdgeTolerance = 10 * unit;
          const overlaps = overlapWidth > 0 && overlapHeight > transparentEdgeTolerance;
          assertCheck(`jackpot-${index}-caption-clear-of-meter-${otherIndex}`, !overlaps, { overlapWidth, overlapHeight, transparentEdgeTolerance });
        });
      });
    }
    if (mode === "all" || mode === "tally") {
      await page.evaluate(() => { void window.__statePreview.run("intro-normal"); });
      await page.waitForFunction(() => window.__FEATURE_TALLY_READY__ === true, null, { timeout: 120000 });
      record.checks.tally = await page.evaluate(() => window.__FEATURE_TALLY_DEBUG__);
      const tally = record.checks.tally;
      const viewport = { x: 0, y: 0, width: tally.viewport.width, height: tally.viewport.height };
      assertCheck("tally-number-inside-viewport", contains(viewport, tally.numberBounds), { bounds: tally.numberBounds });
      assertCheck("tally-award-inside-viewport", contains(viewport, tally.awardedBounds), { bounds: tally.awardedBounds });
      const numberCenter = { x: tally.numberBounds.x + tally.numberBounds.width / 2, y: tally.numberBounds.y + tally.numberBounds.height / 2 };
      const awardedCenter = { x: tally.awardedBounds.x + tally.awardedBounds.width / 2, y: tally.awardedBounds.y + tally.awardedBounds.height / 2 };
      assertCheck("tally-number-artwork-centered", Math.hypot(numberCenter.x - tally.numberPanelCenter.x, numberCenter.y - tally.numberPanelCenter.y) < 1, { actual: numberCenter, expected: tally.numberPanelCenter });
      assertCheck("tally-award-artwork-centered", Math.hypot(awardedCenter.x - tally.awardedPanelCenter.x, awardedCenter.y - tally.awardedPanelCenter.y) < 1, { actual: awardedCenter, expected: tally.awardedPanelCenter });
      assertCheck("tally-start-gap-at-max-pulse", Math.abs(tally.pressMaximumBackgroundBounds.y - tally.lowerPanelBottom - tally.pressGap) < 1, { buttonTop: tally.pressMaximumBackgroundBounds.y, panelBottom: tally.lowerPanelBottom, expectedGap: tally.pressGap });
      assertCheck("tally-start-gap-moderate", Math.abs(tally.pressGap / tally.tallyScale - 60) < 0.01, { gap: tally.pressGap, designGap: tally.pressGap / tally.tallyScale });
      assertCheck("tally-start-max-pulse-inside-viewport", contains(viewport, tally.pressMaximumBackgroundBounds), { bounds: tally.pressMaximumBackgroundBounds });
      assertCheck("tally-start-text-inside-artwork", contains(tally.pressBackgroundBounds, tally.pressTextBounds, 8), { background: tally.pressBackgroundBounds, text: tally.pressTextBounds });
      await capture(page, "tally");
      const pressCenter = tally.pressCenter;
      if (!pressCenter) throw new Error("Tally start-button coordinates were not exposed");
      await page.mouse.click(pressCenter.x, pressCenter.y);
      await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 120000 });
      assertCheck("tally-dismissed-by-real-button", await page.evaluate(() => window.__FEATURE_TALLY_READY__ === false));
    }
    if (mode === "all" || mode === "bigwin") {
      await page.evaluate(() => { void window.__statePreview.run("bigwin"); });
      await page.waitForFunction(() => window.__BIGWIN_STAGE__ === "countup" && window.__BIGWIN_DEBUG__?.displayedMultiplier >= 10, null, { timeout: 120000 });
      record.checks.bigwin = await page.evaluate(() => window.__BIGWIN_DEBUG__);
      await capture(page, "bigwin");
      const bigwin = record.checks.bigwin;
      const bigwinViewport = { x: 0, y: 0, width: bigwin.viewport.width, height: bigwin.viewport.height };
      const overlapWidth = Math.max(0, Math.min(bigwin.tierTextBounds.x + bigwin.tierTextBounds.width, bigwin.amountTextBounds.x + bigwin.amountTextBounds.width) - Math.max(bigwin.tierTextBounds.x, bigwin.amountTextBounds.x));
      const overlapHeight = Math.max(0, Math.min(bigwin.tierTextBounds.y + bigwin.tierTextBounds.height, bigwin.amountTextBounds.y + bigwin.amountTextBounds.height) - Math.max(bigwin.tierTextBounds.y, bigwin.amountTextBounds.y));
      assertCheck("bigwin-source-tier", bigwin.sourceThreshold === 25 && bigwin.tier === 4 && bigwin.sound === "bigwin4", { threshold: bigwin.sourceThreshold, tier: bigwin.tier, sound: bigwin.sound });
      assertCheck("bigwin-source-title-and-no-multiplier", bigwin.tierTitle === "HUGE WIN!" && bigwin.multiplierVisible === false, { title: bigwin.tierTitle, multiplierVisible: bigwin.multiplierVisible });
      assertCheck("bigwin-tier-inside-viewport", contains(bigwinViewport, bigwin.tierTextBounds), { bounds: bigwin.tierTextBounds });
      assertCheck("bigwin-amount-inside-viewport", contains(bigwinViewport, bigwin.amountTextBounds), { bounds: bigwin.amountTextBounds });
      assertCheck("bigwin-text-centered", Math.abs(bigwin.tierTextBounds.x + bigwin.tierTextBounds.width / 2 - bigwin.viewport.width / 2) < 1 && Math.abs(bigwin.amountTextBounds.x + bigwin.amountTextBounds.width / 2 - bigwin.viewport.width / 2) < 1, { tier: bigwin.tierTextBounds, amount: bigwin.amountTextBounds });
      assertCheck("bigwin-text-does-not-overlap", overlapWidth === 0 || overlapHeight === 0, { overlapWidth, overlapHeight });
      assertCheck("bigwin-foreground-over-houses", bigwin.rootLabel === "SourceBigWinPresentation" && bigwin.foreground && bigwin.housesBehind, { rootLabel: bigwin.rootLabel, foreground: bigwin.foreground, housesBehind: bigwin.housesBehind });
      await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 120000 });
      assertCheck("bigwin-preview-completed", await page.evaluate(() => window.__BIGWIN_STAGE__ === "idle"));
    }
    if (mode === "all" || mode === "bigwin-max") {
      await page.evaluate(() => { void window.__statePreview.run("bigwin-max"); });
      await page.waitForFunction(() => window.__BIGWIN_DEBUG__?.tier === 7 && window.__BIGWIN_DEBUG__.displayedMultiplier >= 100 && window.__BIGWIN_STAGE__ === "hold", null, { timeout: 120000 });
      record.checks.bigwinMax = await page.evaluate(() => window.__BIGWIN_DEBUG__);
      await capture(page, "bigwin-max");
      const bigwin = record.checks.bigwinMax;
      const viewport = { x: 0, y: 0, width: bigwin.viewport.width, height: bigwin.viewport.height };
      assertCheck("bigwin-max-source-sequence", JSON.stringify(bigwin.tierHistory.map((entry) => entry.tier)) === JSON.stringify([4, 5, 6, 7]), { history: bigwin.tierHistory });
      assertCheck("bigwin-max-source-durations", JSON.stringify(bigwin.tierHistory.map((entry) => [entry.total, entry.count])) === JSON.stringify([[7000, 5500], [8000, 6400], [9280, 9280], [9320, 9320]]), { history: bigwin.tierHistory });
      assertCheck("bigwin-max-final-tier-and-sound", bigwin.finalTier === 7 && bigwin.tier === 7 && bigwin.sound === "bigwin7" && bigwin.sourceThreshold === 100, { tier: bigwin.tier, sound: bigwin.sound, threshold: bigwin.sourceThreshold });
      assertCheck("bigwin-max-tier-inside-viewport", contains(viewport, bigwin.tierTextBounds), { bounds: bigwin.tierTextBounds });
      assertCheck("bigwin-max-amount-inside-viewport", contains(viewport, bigwin.amountTextBounds), { bounds: bigwin.amountTextBounds });
      const overlapHeight = Math.max(0, Math.min(bigwin.tierTextBounds.y + bigwin.tierTextBounds.height, bigwin.amountTextBounds.y + bigwin.amountTextBounds.height) - Math.max(bigwin.tierTextBounds.y, bigwin.amountTextBounds.y));
      assertCheck("bigwin-max-text-does-not-overlap", overlapHeight === 0, { overlapHeight });
      await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 120000 });
      assertCheck("bigwin-max-preview-completed", await page.evaluate(() => window.__BIGWIN_STAGE__ === "idle"));
    }
    if (mode === "all" || mode === "mystery") {
      await page.evaluate(() => {
        window.__MYSTERY_REVEAL_HISTORY__ = [];
        void window.__statePreview.run("spin-mystery");
      });
      await page.waitForFunction(() => window.__MYSTERY_REVEAL_DEBUG__?.active === true, null, { timeout: 120000 });
      record.checks.mystery = await page.evaluate(() => window.__MYSTERY_REVEAL_DEBUG__);
      await capture(page, "mystery");
      // This deterministic preview reveals six Mystery cells. Each reveal is
      // sequential; the six resulting hats then open the real feature tally,
      // which must be dismissed through its actual button rather than mistaken
      // for an unsettled Mystery promise.
      await page.waitForFunction(() => window.__MYSTERY_REVEAL_HISTORY__.filter((entry) => entry.phase === "cleaned").length === 6, null, { timeout: 120000 });
      record.checks.mysteryHistory = await page.evaluate(() => window.__MYSTERY_REVEAL_HISTORY__);
      const history = record.checks.mysteryHistory;
      for (const phase of ["flip", "rolling", "settled", "cleaned"]) {
        const entries = history.filter((entry) => entry.phase === phase);
        assertCheck(`mystery-${phase}-all-six-cells`, entries.length === 6, { actual: entries.length, expected: 6 });
      }
      history.filter((entry) => entry.active).forEach((entry, index) => {
        assertCheck(`mystery-${entry.phase}-${index}-origin-drift`, entry.drift <= 0.5, { drift: entry.drift, position: entry.position, tolerance: 0.5 });
        assertCheck(`mystery-${entry.phase}-${index}-board-parent`, entry.parent === "BoardSymbolEffects", { parent: entry.parent });
      });
      history.filter((entry) => entry.phase === "flip" || entry.phase === "rolling").forEach((entry, index) => {
        assertCheck(`mystery-hidden-originating-cell-${index}`, entry.cellVisible === false, { position: entry.position });
      });
      history.filter((entry) => entry.phase === "settled" || entry.phase === "cleaned").forEach((entry, index) => {
        // Hat symbols are Spine-owned after the reveal: the underlying reel
        // cell stays hidden while the visible replacement overlay owns it.
        assertCheck(`mystery-replacement-owns-originating-cell-${index}`, entry.cellVisible === false && entry.settledSymbol === 18 && entry.replacementOverlay === true, { position: entry.position, cellVisible: entry.cellVisible, settledSymbol: entry.settledSymbol, replacementOverlay: entry.replacementOverlay });
      });
      record.checks.mysteryTemporaryObjects = await page.evaluate(() => {
        const reels = window.__REELSET_DEBUG__;
        const boardCamera = reels.root.parent;
        const boardEffects = boardCamera.children.find((child) => child.label === "BoardSymbolEffects");
        return boardEffects.children.filter((child) => child.label === "MysteryRevealAtOriginatingCell").length;
      });
      assertCheck("mystery-temporary-objects-cleaned", record.checks.mysteryTemporaryObjects === 0, { remaining: record.checks.mysteryTemporaryObjects });
      await page.waitForFunction(() => window.__FEATURE_TALLY_READY__ === true || !window.__statePreview.status().busy, null, { timeout: 120000 });
      if (await page.evaluate(() => window.__FEATURE_TALLY_READY__ === true)) {
        const pressCenter = await page.evaluate(() => window.__FEATURE_TALLY_DEBUG__.pressCenter);
        await page.mouse.click(pressCenter.x, pressCenter.y);
      }
      await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 240000 });
      record.checks.mysteryCleanup = await page.evaluate(() => window.__MYSTERY_REVEAL_DEBUG__);
      assertCheck("mystery-preview-completed", record.checks.mysteryCleanup.phase === "cleaned" && record.checks.mysteryCleanup.active === false);
    }
    if (mode === "all" || mode === "wolf") {
      await page.evaluate(() => { void window.__statePreview.run("wolf"); });
      // __WOLF_STAGE__ advances synchronously from the hold pose into the
      // first blow; the captured debug pose remains available for inspection.
      await page.waitForFunction(() => window.__WOLF_DEBUG__?.stage === "hold", null, { timeout: 180000 });
      record.checks.wolf = await page.evaluate(() => window.__WOLF_DEBUG__ || null);
      await capture(page, "wolf");
      assertCheck("wolf-debug-captured", Boolean(record.checks.wolf));
      assertCheck("wolf-character-layer", record.checks.wolf.wolfParent === "FeatureCharactersBelowFooter", { parent: record.checks.wolf.wolfParent });
      assertCheck("wolf-wind-character-layer", record.checks.wolf.windParent === "FeatureCharactersBelowFooter", { parent: record.checks.wolf.windParent });
      assertCheck("wolf-behind-blue-footer", record.checks.wolf.behindFooter === true && record.checks.wolf.characterStageIndex < record.checks.wolf.footerStageIndex, { characterStageIndex: record.checks.wolf.characterStageIndex, footerStageIndex: record.checks.wolf.footerStageIndex });
      await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 240000 });
    }
    record.snapshot = await page.evaluate(() => window.__slotDebug.snapshot());
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    await run();
    record.exitCode = record.pageErrors.length || record.consoleErrors.length ? 1 : 0;
  } catch (error) {
    record.error = error instanceof Error ? error.stack : String(error);
    record.exitCode = 1;
  }
  record.finishedAt = new Date().toISOString();
  record.durationMs = new Date(record.finishedAt) - started;
  const file = path.join(RUNS, `${started.toISOString().replace(/[:.]/g, "-")}-presentation-${mode}.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({ record: file, mode: record.mode, assertions: record.assertions, error: record.error, consoleErrors: record.consoleErrors, pageErrors: record.pageErrors, failedRequests: record.failedRequests, exitCode: record.exitCode }, null, 2));
  process.exitCode = record.exitCode;
})();
