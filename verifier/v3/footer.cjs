const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "verification-shots", "verifier-v3");
const RUNS = path.join(ROOT, "verifier", "runs");
const BASE = process.env.GAME_URL || "http://127.0.0.1:4173";
const mode = process.argv[2] || "desktop";
if (!["desktop", "mobile"].includes(mode)) throw new Error("Usage: node verifier/v3/footer.cjs [desktop|mobile]");
const started = new Date();
const record = {
  startedAt: started.toISOString(),
  command: `node verifier/v3/footer.cjs ${mode}`,
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

async function run() {
  const desktop = mode === "desktop";
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: desktop ? { width: 1594, height: 898 } : { width: 390, height: 844 },
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
      await page.mouse.click(desktop ? 797 : 195, desktop ? 440 : 410);
    }
    await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug && window.__statePreview, null, { timeout: 120000 });
    await page.evaluate(() => window.__statePreview.run("base"));
    await page.waitForFunction(() => !window.__statePreview.status().busy);
    await page.waitForTimeout(300);
    record.checks.footer = await page.evaluate(() => {
      const stage = window.__REELSET_DEBUG__.root.parent.parent.parent;
      const texts = [];
      const visit = (object) => {
        if (typeof object.text === "string") texts.push(object);
        for (const child of object.children || []) visit(child);
      };
      visit(stage);
      const rect = (bounds) => ({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
      const read = (prefix) => {
        const object = texts.find((text) => text.text.startsWith(prefix));
        if (!object) return null;
        const position = object.getGlobalPosition();
        return { text: object.text, position: { x: position.x, y: position.y }, bounds: rect(object.getBounds()), fontSize: object.style.fontSize };
      };
      const balance = read("Balance");
      return {
        viewport: { width: innerWidth, height: innerHeight },
        balance,
        win: read("Win"),
        bet: read("Bet"),
        boardCamera: window.__slotDebug.snapshot().boardCamera
      };
    });
    await page.screenshot({ path: path.join(OUT, `${mode}.png`) });
    const { viewport, balance, win, bet, boardCamera } = record.checks.footer;
    const expected = desktop
      ? { balance: "Balance $1,000.00", win: "Win", bet: "Bet $2.00", x: [0.2, 0.5, 0.8] }
      : { balance: "Balance\n$1,000.00", win: "Win\n$0.00", bet: "Bet\n$2.00", x: [0.19, 0.5, 0.8] };
    assertCheck(`${mode}-balance-exact-text`, balance?.text === expected.balance, { actual: balance?.text, expected: expected.balance });
    assertCheck(`${mode}-win-exact-text`, win?.text === expected.win, { actual: win?.text, expected: expected.win });
    assertCheck(`${mode}-bet-exact-text`, bet?.text === expected.bet, { actual: bet?.text, expected: expected.bet });
    assertCheck(`${mode}-desktop-line-composition`, !desktop || [balance, win, bet].every((meter) => !meter.text.includes("\n")), { actual: [balance?.text, win?.text, bet?.text] });
    [balance, win, bet].forEach((meter, index) => {
      const expectedX = viewport.width * expected.x[index];
      assertCheck(`${mode}-meter-${index}-source-x`, Math.abs(meter.position.x - expectedX) <= 1, { actual: meter.position.x, expected: expectedX, tolerance: 1 });
    });
    const centerY = balance.position.y;
    assertCheck(`${mode}-meters-share-y`, Math.abs(win.position.y - centerY) <= 0.01 && Math.abs(bet.position.y - centerY) <= 0.01, { y: [balance.position.y, win.position.y, bet.position.y] });
    if (!desktop) assertCheck("mobile-board-camera-remains-idle", boardCamera.progress === 0 && boardCamera.scale === 1 && boardCamera.girderScale === 1, { boardCamera });
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
  const file = path.join(RUNS, `${started.toISOString().replace(/[:.]/g, "-")}-footer-v3-${mode}.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({ record: file, mode: record.mode, checks: record.checks, assertions: record.assertions, error: record.error, consoleErrors: record.consoleErrors, pageErrors: record.pageErrors, failedRequests: record.failedRequests, exitCode: record.exitCode }, null, 2));
  process.exitCode = record.exitCode;
})();
