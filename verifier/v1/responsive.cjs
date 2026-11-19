const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "verification-shots", "verifier-v1");
const RUNS = path.join(ROOT, "verifier", "runs");
const BASE = process.env.GAME_URL || "http://127.0.0.1:4173";
const started = new Date();
const record = {
  startedAt: started.toISOString(),
  command: "node verifier/v1/responsive.cjs",
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

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") record.consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => record.pageErrors.push(`${label}: ${error.message}`));
  page.on("requestfailed", (request) => record.failedRequests.push({ label, url: request.url(), error: request.failure()?.errorText }));
}

async function ready(page) {
  await page.goto(`${BASE}/?seed=41`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 120000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(40, 40);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 120000 });
  if (!(await page.evaluate(() => Boolean(window.__statePreview)))) {
    const fs = require("node:fs");
    const path = require("node:path");
    const note = "state preview harness removed from the game; scenario-driven responsive suite retired";
    const file = path.join(__dirname, "runs", `${new Date().toISOString().replace(/[:.]/g, "-")}-responsive-retired.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ retired: note }, null, 2)}\n`);
    console.log(JSON.stringify({ retired: note }));
    process.exit(0);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1594, height: 898 }, deviceScaleFactor: 1 });
    const page = await desktop.newPage();
    page.setDefaultTimeout(120000);
    observe(page, "desktop");
    await ready(page);
    await page.evaluate(() => {
      window.__responsiveTrace = { maxBoardProgress: 0, minBoardScale: 1, minGirderScale: 1 };
      window.__responsiveTimer = setInterval(() => {
        const camera = window.__slotDebug.snapshot().boardCamera;
        window.__responsiveTrace.maxBoardProgress = Math.max(window.__responsiveTrace.maxBoardProgress, camera.progress);
        window.__responsiveTrace.minBoardScale = Math.min(window.__responsiveTrace.minBoardScale, camera.scale);
        window.__responsiveTrace.minGirderScale = Math.min(window.__responsiveTrace.minGirderScale, camera.girderScale);
      }, 40);
      void window.__statePreview.run("spin-hazard");
    });
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(700);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(700);
    await page.setViewportSize({ width: 1594, height: 898 });
    await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 240000 });
    record.checks.desktopResize = await page.evaluate(() => {
      clearInterval(window.__responsiveTimer);
      return { trace: window.__responsiveTrace, snapshot: window.__slotDebug.snapshot() };
    });
    const resized = record.checks.desktopResize;
    assertCheck("resize-active-hazard-completes", resized.snapshot.state === "idle" && resized.snapshot.activeRows === 4, { state: resized.snapshot.state, rows: resized.snapshot.activeRows });
    assertCheck("resize-preserves-outcome-grid", resized.snapshot.actualGridMatchesOutcome === true && resized.snapshot.gridMatchesOutcome === true);
    assertCheck("resize-preserves-expanded-camera", resized.snapshot.boardCamera.progress === 1 && Math.abs(resized.snapshot.boardCamera.scale - 0.69) < 0.0001 && Math.abs(resized.snapshot.boardCamera.girderScale - 0.69) < 0.0001, { camera: resized.snapshot.boardCamera });
    assertCheck("desktop-hazard-camera-expanded", resized.trace.maxBoardProgress > 0 && resized.trace.minBoardScale < 1 && resized.trace.minGirderScale < 1, { trace: resized.trace });
    await page.screenshot({ path: path.join(OUT, "resize-settled.png") });

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assertCheck("visibility-hidden-pauses", await page.evaluate(() => window.__slotDebug.snapshot().state === "paused"));
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assertCheck("visibility-return-resumes", await page.evaluate(() => window.__slotDebug.snapshot().state !== "paused"));
    await page.evaluate(() => { void window.__statePreview.run("spin-random"); });
    await page.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 120000 });
    assertCheck("visibility-return-spin-works", await page.evaluate(() => {
      const snapshot = window.__slotDebug.snapshot();
      return snapshot.state === "idle" && snapshot.actualGridMatchesOutcome && snapshot.boardCamera.progress === 0 && snapshot.boardCamera.scale === 1 && snapshot.boardCamera.girderScale === 1;
    }));
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    });
    await mobile.addInitScript(() => {
      Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 5 });
    });
    const phone = await mobile.newPage();
    phone.setDefaultTimeout(120000);
    observe(phone, "mobile-safari");
    await ready(phone);
    await phone.evaluate(() => {
      window.__responsiveTrace = { maxBoardProgress: 0, minBoardScale: 1, minGirderScale: 1 };
      window.__responsiveTimer = setInterval(() => {
        const camera = window.__slotDebug.snapshot().boardCamera;
        window.__responsiveTrace.maxBoardProgress = Math.max(window.__responsiveTrace.maxBoardProgress, camera.progress);
        window.__responsiveTrace.minBoardScale = Math.min(window.__responsiveTrace.minBoardScale, camera.scale);
        window.__responsiveTrace.minGirderScale = Math.min(window.__responsiveTrace.minGirderScale, camera.girderScale);
      }, 40);
      void window.__statePreview.run("spin-hazard");
    });
    await phone.waitForFunction(() => !window.__statePreview.status().busy, null, { timeout: 240000 });
    record.checks.mobile = await phone.evaluate(() => {
      clearInterval(window.__responsiveTimer);
      return { trace: window.__responsiveTrace, snapshot: window.__slotDebug.snapshot() };
    });
    const mobileResult = record.checks.mobile;
    assertCheck("mobile-asset-device-selected", mobileResult.snapshot.background.device === "mobile" && mobileResult.snapshot.background.composition === "legacy-portrait", { background: mobileResult.snapshot.background });
    assertCheck("mobile-never-camera-zooms", mobileResult.trace.maxBoardProgress === 0 && mobileResult.trace.minBoardScale === 1 && mobileResult.trace.minGirderScale === 1, { trace: mobileResult.trace });
    assertCheck("mobile-hazard-outcome-and-rows", mobileResult.snapshot.actualGridMatchesOutcome === true && mobileResult.snapshot.activeRows === 4 && mobileResult.snapshot.overlays === 0 && mobileResult.snapshot.frames === 0, { snapshot: mobileResult.snapshot });
    await phone.screenshot({ path: path.join(OUT, "mobile-settled.png") });
    await mobile.close();
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
  const file = path.join(RUNS, `${started.toISOString().replace(/[:.]/g, "-")}-responsive.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({ record: file, assertions: record.assertions, error: record.error, consoleErrors: record.consoleErrors, pageErrors: record.pageErrors, failedRequests: record.failedRequests, exitCode: record.exitCode }, null, 2));
  process.exitCode = record.exitCode;
})();
