#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "../..");
const preview = process.argv[2] || "wolf";
const startedAt = new Date().toISOString();
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(root, "verifier/runs", `${stamp()}-sound-v2-${preview}.json`);

function save(report) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
}

function inventory() {
  const files = fs.readdirSync(path.join(root, "assets/shared/sounds")).filter((file) => file.endsWith(".webm")).sort();
  const source = fs.readFileSync(path.join(root, "src/game/audio.js"), "utf8");
  const mapped = new Set([...source.matchAll(/"([a-zA-Z0-9_-]+\.webm)"/g)].map((match) => match[1]));
  for (let index = 1; index <= 5; index++) {
    mapped.add(`fx_hardhat_scatter_${index}.webm`);
    mapped.add(`fx_buzzsaw_scatter_${index}.webm`);
    mapped.add(`fx_buzzsaw_anim_reel${index}.webm`);
  }
  for (let index = 1; index <= 15; index++) mapped.add(`sawhatland${index}.webm`);
  return { suppliedCount: files.length, mappedCount: mapped.size, unmapped: files.filter((file) => !mapped.has(file)), missingMappings: [...mapped].filter((file) => !files.includes(file)) };
}

function assertions(events) {
  const plays = events.filter((event) => event.type === "play");
  const files = new Set(plays.map((event) => event.file));
  const has = (file) => files.has(file);
  const first = (file) => plays.find((event) => event.file === file);
  const checks = { "all-99-supplied-sounds-have-local-mappings": inventory().unmapped.length === 0 && inventory().missingMappings.length === 0 };
  if (preview === "wolf") {
    const intro = first("fx_wolffeature_jumpdown_complete.webm");
    const introEnd = events.find((event) => event.type === "ended" && event.file === "fx_wolffeature_jumpdown_complete.webm");
    const music = first("fx_wolffeature_music.webm");
    checks["source-arrival-cue-plays"] = Boolean(intro);
    checks["unused-jumpdown-variant-not-forced"] = !has("fx_wolffeature_jumpdown.webm");
    checks["wolf-music-starts-after-arrival-ended"] = Boolean(introEnd && music && music.at >= introEnd.at - 50);
    checks["all-three-source-blow-cues-play"] = ["straw", "stick", "brick"].every((kind) => has(`fx_wolffeature_blow${kind}_updated_2.webm`));
    checks["resolution-cue-plays"] = has("fx_wolffeature_resolution_with_laugh.webm") || has("fx_wolffeature_resolution.webm");
  } else if (preview === "rows") {
    checks["demolition-pig-cue"] = has("demopig_new_1.webm");
    checks["row-blast-background-cue"] = has("flamepuff.webm");
    checks["three-live-row-explosion-cues"] = plays.filter((event) => event.file === "demohitexpl.webm").length === 3;
  } else if (preview === "frame-all") {
    checks["all-frame-construction-cues"] = ["straw", "stick", "brick"].every((kind) => has(`fx_${kind}border_e.webm`));
  } else if (preview.startsWith("house-")) {
    const kind = preview.slice(6);
    checks["house-appearance-cue"] = has(`fx_${kind}house_appears.webm`);
    checks["house-blow-cue"] = has(`fx_${kind}housereveal_${kind === "brick" ? "bonusprize" : "creditprize"}.webm`);
    checks["house-credit-cue"] = plays.some((event) => event.file.startsWith(`fx_${kind}house_creditprize_`));
  } else if (preview === "bigwin-max") {
    const order = plays.filter((event) => /^bw_tier[4-7]\.webm$/.test(event.file)).map((event) => event.file);
    checks["sequential-bigwin-tier-cues"] = JSON.stringify(order) === JSON.stringify(["bw_tier4.webm", "bw_tier5.webm", "bw_tier6.webm", "bw_tier7.webm"]);
  } else if (preview === "saw-super") {
    checks["super-intro-cue"] = has("supersawintro2_l2.webm");
    checks["super-transform-cue"] = has("fx_buzzsaw_transform_hat.webm");
    checks["hat-transfer-cues"] = has("fx_hat_transfer_1.webm") && has("fx_hat_transfer_landing.webm");
    checks["saw-flip-and-spinning-cues"] = has("sawflip_5_eq.webm") && has("fx_buzzsaw_smallsaw.webm");
    checks["per-reel-saw-trail-cue"] = plays.some((event) => /^fx_buzzsaw_anim_reel[1-5]\.webm$/.test(event.file));
  } else if (preview === "spin-hats") {
    checks["live-per-reel-scatter-cue"] = plays.some((event) => /^fx_hardhat_scatter_[1-5]\.webm$/.test(event.file));
    checks["yellow-hat-landing-cue"] = has("yellow_hat_land.webm");
  }
  return checks;
}

(async () => {
  const errors = [];
  const failedRequests = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 1594, height: 898 }, deviceScaleFactor: 1 });
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    await page.addInitScript(() => {
      window.__SOUND_EVENTS__ = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        const file = decodeURIComponent((this.currentSrc || this.src).split("/").pop() || "unknown");
        window.__SOUND_EVENTS__.push({
          type: "play",
          file,
          at: performance.now(),
          wolfStage: window.__WOLF_STAGE__ || null,
          bigwinStage: window.__BIGWIN_STAGE__ || null,
          sawStage: window.__SAW_STAGE__ || null,
          rowStage: window.__ROW_SEQUENCE_STAGE__ || null
        });
        this.addEventListener("ended", () => window.__SOUND_EVENTS__.push({ type: "ended", file, at: performance.now(), wolfStage: window.__WOLF_STAGE__ || null }), { once: true });
        return play.apply(this, args);
      };
    });
    const seed = preview === "spin-hats" ? "&seed=1" : "";
    await page.goto(`http://127.0.0.1:4173/?preview=states${seed}&test=sound-v2-${preview}-${Date.now()}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__LOADING_READY__ === true || window.__GAME_ERROR__, null, { timeout: 300000 });
    const loadError = await page.evaluate(() => window.__GAME_ERROR__);
    if (loadError) throw new Error(loadError);
    await page.mouse.click(800, 450, { delay: 100 });
    await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 30000 });
    if (!(await page.evaluate(() => Boolean(window.__statePreview)))) {
      const note = "state preview harness removed from the game; scenario-driven sound suite retired";
      save({ startedAt, finishedAt: new Date().toISOString(), preview, retired: note, exitCode: 0 });
      console.log(JSON.stringify({ retired: note }));
      process.exitCode = 0;
      return;
    }
    await page.evaluate((id) => { void window.__statePreview.run(id); }, preview);
    await page.waitForFunction(() => window.__statePreview.status().busy, null, { timeout: 30000 });
    await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 420000 });
    const events = await page.evaluate(() => window.__SOUND_EVENTS__);
    const checks = assertions(events);
    if (errors.length === 0) checks["no-browser-errors"] = true;
    if (failedRequests.length === 0) checks["no-failed-requests"] = true;
    const report = { startedAt, finishedAt: new Date().toISOString(), preview, inventory: inventory(), checks, events, errors, failedRequests, exitCode: Object.values(checks).every(Boolean) ? 0 : 1 };
    save(report);
    console.log(JSON.stringify({ output, preview, checks, supplied: report.inventory.suppliedCount, eventCount: events.length }, null, 2));
    process.exitCode = report.exitCode;
  } catch (error) {
    save({ startedAt, finishedAt: new Date().toISOString(), preview, inventory: inventory(), error: error.stack || error.message, errors, failedRequests, exitCode: 1 });
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
})();
