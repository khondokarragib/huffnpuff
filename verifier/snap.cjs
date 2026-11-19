const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
(async () => {
  const w = parseInt(process.argv[2] || "1594", 10);
  const h = parseInt(process.argv[3] || "898", 10);
  const dir = process.argv[4] || "/tmp/snap";
  const shots = parseInt(process.argv[5] || "3", 10);
  require("fs").mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://127.0.0.1:4173/?seed=7", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 150000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(w / 2, h / 2);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 150000 });
  await page.waitForTimeout(1500);
  for (let i = 0; i < shots; i++) {
    await page.screenshot({ path: `${dir}/snap_${i}.png` });
    await page.waitForTimeout(800);
  }
  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
