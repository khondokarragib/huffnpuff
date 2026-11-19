const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
const fs = require("fs");
(async () => {
  const w = parseInt(process.argv[2] || "902", 10);
  const h = parseInt(process.argv[3] || "780", 10);
  const scenario = process.argv[4] || "spin-feature";
  const dir = process.argv[5] || "/tmp/feature";
  const shots = parseInt(process.argv[6] || "10", 10);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  await page.goto("http://127.0.0.1:4173/?seed=7", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 150000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(w / 2, h / 2);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 150000 });
  await page.waitForTimeout(500);
  const t0 = Date.now();
  await page.evaluate((s) => { void window.__statePreview.run(s); return "started"; }, scenario);
  for (let i = 0; i < shots; i++) {
    const el = Date.now() - t0;
    const state = await page.evaluate(() => window.__slotDebug?.snapshot()?.state ?? "?");
    await page.screenshot({ path: `${dir}/f${String(i).padStart(2, "0")}_${el}ms.png` });
    console.log(`frame ${i} at ${el}ms state=${state}`);
    const tallyReady = await page.evaluate(() => !!window.__FEATURE_TALLY_READY__);
    if (tallyReady) {
      const press = await page.evaluate(() => window.__FEATURE_TALLY_DEBUG__?.pressCenter ?? null);
      const cx = press ? press.x : w / 2;
      const cy = press ? press.y : h * 0.72;
      await page.mouse.click(cx, cy);
      console.log(`  clicked press-to-start at ${cx},${cy}`);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(900);
  }
  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
