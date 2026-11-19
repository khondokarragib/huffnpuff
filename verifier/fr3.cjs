const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
const fs = require("fs");
(async () => {
  const w = 902, h = 780;
  const dir = "/mnt/agents/output/verification-shots/feature_resize3";
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
  await page.goto("http://127.0.0.1:4173/?seed=7", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__LOADING_DEBUG__?.waitingForContinue || window.__GAME_READY__, null, { timeout: 150000 });
  if (await page.evaluate(() => window.__LOADING_DEBUG__?.waitingForContinue)) await page.mouse.click(w / 2, h / 2);
  await page.waitForFunction(() => window.__GAME_READY__ && window.__slotDebug, null, { timeout: 150000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { void window.__statePreview.run("spin-feature"); return "started"; });
  // wait for the tally to be ready, click once, confirm dismissal
  await page.waitForFunction(() => window.__FEATURE_TALLY_READY__ === true, null, { timeout: 120000 });
  const press = await page.evaluate(() => window.__FEATURE_TALLY_DEBUG__.pressCenter);
  console.log("tally ready, pressCenter", JSON.stringify(press));
  await page.mouse.click(press.x, press.y);
  await page.waitForTimeout(2500);
  const readyAfter = await page.evaluate(() => window.__FEATURE_TALLY_READY__);
  console.log("tallyReady after click:", readyAfter);
  if (readyAfter) { // retry once at viewport centre of the visible button
    await page.mouse.click(w / 2, h * 0.71);
    await page.waitForTimeout(2500);
    console.log("tallyReady after retry:", await page.evaluate(() => window.__FEATURE_TALLY_READY__));
  }
  // wait for free spins to get going (entry construction + first spin)
  await page.waitForTimeout(12000);
  const st1 = await page.evaluate(() => window.__slotDebug?.snapshot()?.state);
  await page.screenshot({ path: `${dir}/fs_before_resize_${st1}.png` });
  console.log("pre-resize state", st1);
  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForTimeout(1500);
  const st2 = await page.evaluate(() => window.__slotDebug?.snapshot()?.state);
  await page.screenshot({ path: `${dir}/fs_after_resize_${st2}.png` });
  console.log("post-resize state", st2);
  await page.waitForTimeout(6000);
  const st3 = await page.evaluate(() => window.__slotDebug?.snapshot()?.state);
  await page.screenshot({ path: `${dir}/fs_later_${st3}.png` });
  console.log("later state", st3);
  console.log("DIAG", JSON.stringify(await page.evaluate(() => {
    const s = window.__slotDebug.snapshot();
    return { frames: s.frames, overlays: s.overlays, state: s.state, activeRows: s.activeRows };
  })));
  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
