const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "verification-shots", "verifier-v4");
const RUNS = path.join(ROOT, "verifier", "runs");
const BASE = process.env.GAME_URL || "http://127.0.0.1:4173";
const mode = process.argv[2] || "short";
if (!["short", "desktop", "mobile"].includes(mode)) throw new Error("Usage: node verifier/v4/controls.cjs [short|desktop|mobile]");
const started = new Date();
const record = {
  startedAt: started.toISOString(),
  command: `node verifier/v4/controls.cjs ${mode}`,
  mode,
  checks: {},
  assertions: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: []
};
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RUNS, { recursive: true });

function assertCheck(name, pass, details = {}) {
  record.assertions.push({ name, pass: Boolean(pass), ...details });
  if (!pass) throw new Error(`Acceptance check failed: ${name}`);
}

// Source-derived expectations for the landscape control cluster.
function expected(w, h) {
  const unit = w / 1920;
  // The slim source footer and the 0.85 control-cluster reduction the user
  // asked for (less "fat" desktop UI).
  const footerH = h * 0.06;
  const footerTop = h - footerH;
  const SLIM = 0.85;
  const rightX = w - 200 * unit;
  const panelBottom = footerTop - 16 * unit;
  const panelCenterY = panelBottom - 45 * unit * SLIM;
  // The landscape board keeps the 0.53 width ratio but is capped so its
  // 603:523-height fits within 90% of the screen above the footer (user-requested
  // full-container fit; see slotGame layout).
  const boardWidth = Math.min(0.53 * w, (h - footerH) * 0.9 * 523 / 603);
  return {
    unit,
    footerTop,
    boardWidth,
    boardX: (w - boardWidth) / 2,
    spin: { cx: rightX, cy: h / 2, size: 240 * unit * SLIM },
    betBackdrop: { x: rightX - (305 * unit * SLIM) / 2, y: panelCenterY - (90 * unit * SLIM) / 2, width: 305 * unit * SLIM, height: 90 * unit * SLIM },
    betIcon: { cx: rightX, cy: panelCenterY, size: 68 * unit * SLIM },
    plus: { cx: rightX + 0.3 * 305 * unit * SLIM, cy: panelCenterY, size: 76 * unit * SLIM },
    minus: { cx: rightX - 0.3 * 305 * unit * SLIM, cy: panelCenterY, size: 76 * unit * SLIM },
    auto: { cx: rightX, cy: footerTop - 146 * unit * SLIM - (115 * unit * SLIM) / 2, size: 115 * unit * SLIM },
    turbo: { x: 210 * unit, bottom: footerTop - 16 * unit, size: 110 * unit * SLIM },
    menu: { x: 40 * unit, bottom: footerTop - 6 * unit, size: 100 * unit * SLIM },
    buy: { x: 40 * unit, bottom: footerTop - 146 * unit * SLIM }
  };
}

function near(actual, expectedValue, tolerance, label) {
  return Math.abs(actual - expectedValue) <= tolerance;
}

async function run() {
  const desktop = mode !== "mobile";
  const viewport = mode === "short" ? { width: 728, height: 421 } : mode === "desktop" ? { width: 1594, height: 898 } : { width: 390, height: 844 };
  const tolerance = mode === "desktop" ? 6 : 4;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    userAgent: desktop
      ? "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      : "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    hasTouch: !desktop
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
    if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) {
      await page.mouse.click(viewport.width / 2, viewport.height / 2);
    }
    await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug && window.__statePreview, null, { timeout: 120000 });
    await page.evaluate(() => window.__statePreview.run("base"));
    await page.waitForFunction(() => !window.__statePreview.status().busy);
    await page.waitForTimeout(300);
    record.checks.controls = await page.evaluate(() => {
      const snapshot = window.__slotDebug.snapshot();
      const reels = window.__REELSET_DEBUG__;
      return { viewport: { width: innerWidth, height: innerHeight }, controls: snapshot.controlBounds, board: { x: reels.x, y: reels.y, width: reels.width, height: reels.height } };
    });
    await page.screenshot({ path: path.join(OUT, `${mode}.png`) });
    const { viewport: vp, controls, board } = record.checks.controls;
    const exp = expected(vp.width, vp.height);
    if (mode === "mobile") {
      assertCheck("mobile-spin-visible", controls.spin.width > 0 && controls.spin.height > 0, { spin: controls.spin });
      assertCheck("mobile-bet-controls-visible", controls.plus.width > 0 && controls.minus.width > 0, { plus: controls.plus, minus: controls.minus });
      assertCheck("mobile-board-portrait-width", near(board.width, vp.width * 0.96, 2, "boardW"), { actual: board.width, expected: vp.width * 0.96 });
      // Portrait keeps its own stake panel low in the scene, not the desktop
      // right-column cluster.
      assertCheck("mobile-portrait-stake-panel", controls.betBackdrop.y > vp.height * 0.6, { betBackdrop: controls.betBackdrop });
    } else {
      const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
      assertCheck(`${mode}-board-width-source-ratio`, near(board.width, exp.boardWidth, 2, "boardW"), { actual: board.width, expected: exp.boardWidth });
      assertCheck(`${mode}-board-x-centered`, near(board.x, exp.boardX, 2, "boardX"), { actual: board.x, expected: exp.boardX });
      assertCheck(`${mode}-stake-backdrop-bounds`,
        near(controls.betBackdrop.x, exp.betBackdrop.x, tolerance, "x") &&
        near(controls.betBackdrop.y, exp.betBackdrop.y, tolerance, "y") &&
        near(controls.betBackdrop.width, exp.betBackdrop.width, tolerance, "w") &&
        near(controls.betBackdrop.height, exp.betBackdrop.height, tolerance, "h"),
        { actual: controls.betBackdrop, expected: exp.betBackdrop });
      const icon = center(controls.betIcon);
      assertCheck(`${mode}-coin-icon-center`, near(icon.x, exp.betIcon.cx, tolerance, "cx") && near(icon.y, exp.betIcon.cy, tolerance, "cy"), { actual: icon, expected: exp.betIcon });
      const plus = center(controls.plus);
      const minus = center(controls.minus);
      assertCheck(`${mode}-plus-position`, near(plus.x, exp.plus.cx, tolerance, "cx") && near(plus.y, exp.plus.cy, tolerance, "cy"), { actual: plus, expected: exp.plus });
      assertCheck(`${mode}-minus-position`, near(minus.x, exp.minus.cx, tolerance, "cx") && near(minus.y, exp.minus.cy, tolerance, "cy"), { actual: minus, expected: exp.minus });
      const spin = center(controls.spin);
      assertCheck(`${mode}-spin-position`, near(spin.x, exp.spin.cx, tolerance, "cx") && near(spin.y, exp.spin.cy, tolerance, "cy"), { actual: spin, expected: exp.spin });
      assertCheck(`${mode}-spin-size`, near(controls.spin.width, exp.spin.size, tolerance, "w"), { actual: controls.spin.width, expected: exp.spin.size });
      const auto = center(controls.auto);
      assertCheck(`${mode}-autoplay-position`, near(auto.x, exp.auto.cx, tolerance, "cx") && near(auto.y, exp.auto.cy, tolerance, "cy"), { actual: auto, expected: exp.auto });
      assertCheck(`${mode}-turbo-bottom-left`,
        near(controls.turbo.x, exp.turbo.x, tolerance, "x") && near(controls.turbo.y + controls.turbo.height, exp.turbo.bottom, tolerance, "bottom"),
        { actual: controls.turbo, expected: exp.turbo });
      assertCheck(`${mode}-menu-bottom-left`,
        near(controls.menu.x, exp.menu.x, tolerance, "x") && near(controls.menu.y + controls.menu.height, exp.menu.bottom, tolerance, "bottom"),
        { actual: controls.menu, expected: exp.menu });
      assertCheck(`${mode}-buy-bottom-left`,
        near(controls.buy.x, exp.buy.x, tolerance, "x") && near(controls.buy.y + controls.buy.height, exp.buy.bottom, tolerance, "bottom"),
        { actual: controls.buy, expected: exp.buy });
      if (mode === "short") {
        // Balance text sits at 0.2w in the footer; the left control cluster
        // must stay clear of it (was overlapping before this fix).
        const balanceX = vp.width * 0.2;
        const clusterRight = Math.max(controls.turbo.x + controls.turbo.width, controls.menu.x + controls.menu.width, controls.buy.x + controls.buy.width);
        assertCheck("short-left-cluster-clears-balance", clusterRight < balanceX - 10, { clusterRight, balanceX });
      }
    }
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    await run();
    record.exitCode = record.pageErrors.length || record.consoleErrors.length || record.failedRequests.length ? 1 : 0;
  } catch (error) {
    record.error = error instanceof Error ? error.stack : String(error);
    record.exitCode = 1;
  }
  record.finishedAt = new Date().toISOString();
  record.durationMs = new Date(record.finishedAt) - started;
  const file = path.join(RUNS, `${started.toISOString().replace(/[:.]/g, "-")}-controls-v4-${mode}.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({ record: file, mode: record.mode, assertions: record.assertions.map((a) => ({ name: a.name, pass: a.pass })), error: record.error, consoleErrors: record.consoleErrors, pageErrors: record.pageErrors, failedRequests: record.failedRequests, exitCode: record.exitCode }, null, 2));
  process.exitCode = record.exitCode;
})();
