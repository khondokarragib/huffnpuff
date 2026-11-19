const { chromium } = require("/home/kimi/.npm-global/lib/node_modules/playwright");
const fs = require("fs");
(async () => {
  const w = parseInt(process.argv[2] || "902", 10);
  const h = parseInt(process.argv[3] || "780", 10);
  const dir = process.argv[4] || "/tmp/fr";
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
  // click through intro whenever it appears
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__slotDebug?.snapshot()?.state ?? "?");
    const tallyReady = await page.evaluate(() => !!window.__FEATURE_TALLY_READY__);
    if (tallyReady) {
      const press = await page.evaluate(() => window.__FEATURE_TALLY_DEBUG__?.pressCenter ?? null);
      await page.mouse.click(press ? press.x : w / 2, press ? press.y : h * 0.72);
      console.log(`intro click at frame ${i}`);
      await page.waitForTimeout(400);
    }
    if (st === "spinning" || st === "presenting") {
      console.log(`feature active at poll ${i}, state=${st}`);
      break;
    }
    await page.waitForTimeout(700);
  }
  // keep clicking through the intro until free spins actually start
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__slotDebug?.snapshot()?.state ?? "?");
    const tallyReady = await page.evaluate(() => !!window.__FEATURE_TALLY_READY__);
    if (tallyReady) {
      const press = await page.evaluate(() => window.__FEATURE_TALLY_DEBUG__?.pressCenter ?? null);
      await page.mouse.click(press ? press.x : 400, press ? press.y : 560);
      await page.waitForTimeout(600);
      continue;
    }
    if (st !== "featureIntro") break;
    await page.waitForTimeout(700);
  }
  // let entry construction finish and free spins begin
  await page.waitForTimeout(9000);
  const st1 = await page.evaluate(() => window.__slotDebug?.snapshot()?.state);
  await page.screenshot({ path: `${dir}/fs_before_resize_${st1}.png` });
  console.log("pre-resize state", st1);
  // MID-FEATURE RESIZE
  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForTimeout(1500);
  const st2 = await page.evaluate(() => window.__slotDebug?.snapshot()?.state);
  await page.screenshot({ path: `${dir}/fs_after_resize_${st2}.png` });
  console.log("post-resize state", st2);
  await page.waitForTimeout(4000);
  const st3 = await page.evaluate(() => window.__slotDebug?.snapshot()?.state);
  await page.screenshot({ path: `${dir}/fs_later_${st3}.png` });
  console.log("later state", st3);
  // dump overlay diagnostics
  const diag = await page.evaluate(() => {
    const s = window.__slotDebug.snapshot();
    return { frames: s.frames, overlays: s.overlays, state: s.state, boardCamera: s.boardCamera };
  });
  console.log("DIAG", JSON.stringify(diag));
  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
