const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
const fs = require("fs");
(async () => {
  const dir = process.argv[2] || "/tmp/settle";
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  await page.goto("http://127.0.0.1:4173/?seed=41", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 150000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(640, 360);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 150000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { void window.__statePreview.run("spin-mystery"); return "started"; });
  await page.waitForFunction(() => window.__slotDebug.snapshot().state === "idle", null, { timeout: 200000 });
  console.log("idle reached");
  for (let i = 0; i < 4; i++) {
    const el = await page.evaluate(() => {
      const s = window.__slotDebug.snapshot();
      return { state: s.state, rootY: window.__GIRDER_ROOT_Y__ ?? null };
    });
    await page.screenshot({ path: `${dir}/settle_${i}.png` });
    console.log(`settle frame ${i}`, JSON.stringify(el));
    await page.waitForTimeout(400);
  }
  await browser.close();
  console.log("SETTLE PROBE DONE");
})().catch((e) => { console.error("PROBE FAIL", e.message); process.exit(1); });
