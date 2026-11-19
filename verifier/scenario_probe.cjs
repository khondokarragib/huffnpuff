const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
const fs = require("fs");
(async () => {
  const scenario = process.argv[2] || "spin-mystery";
  const dir = process.argv[3] || "/tmp/probe";
  const shots = parseInt(process.argv[4] || "16", 10);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  await page.goto("http://127.0.0.1:4173/?seed=41", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 150000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(640, 360);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 150000 });
  await page.waitForTimeout(500);
  const t0 = Date.now();
  await page.evaluate((s) => { void window.__statePreview.run(s); return "started"; }, scenario);
  for (let i = 0; i < shots; i++) {
    const el = Date.now() - t0;
    const state = await page.evaluate(() => window.__slotDebug?.snapshot()?.state ?? "?");
    await page.screenshot({ path: `${dir}/t${String(i).padStart(2, "0")}_${el}ms.png` });
    console.log(`frame ${i} at ${el}ms state=${state}`);
    await page.waitForTimeout(700);
  }
  await browser.close();
  console.log("PROBE DONE");
})().catch((e) => { console.error("PROBE FAIL", e.message); process.exit(1); });
