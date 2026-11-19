const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
const fs = require("fs");
(async () => {
  const dir = process.argv[2] || "/tmp/girder_frames";
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 200)));
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  console.log("goto...");
  await page.goto("http://127.0.0.1:4173/?seed=41", { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("domcontentloaded");
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 150000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(640, 360);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 150000 });
  await page.waitForTimeout(500);
  const t0 = Date.now();
  await page.evaluate(() => { void window.__statePreview.run("spin-mystery"); return "started"; });
  for (let i = 0; i < 16; i++) {
    const info = await page.evaluate(() => {
      const dbg = window.__slotDebug;
      const snap = dbg.snapshot();
      return {
        state: snap.state,
        ms: snap.mysteryMs || null
      };
    });
    const el = Date.now() - t0;
    await page.screenshot({ path: `${dir}/t${String(i).padStart(2, "0")}_${el}ms.png` });
    console.log(`frame ${i} at ${el}ms state=${info.state}`);
    await page.waitForTimeout(700);
  }
  await browser.close();
  console.log("PROBE DONE");
})().catch((e) => { console.error("PROBE FAIL", e.message); process.exit(1); });
