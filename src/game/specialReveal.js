import { AnimatedSprite, Container, Graphics, Sprite } from "../../vendor.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tween = (duration, update, ease = (t) => t) => new Promise((resolve) => {
  let started = 0;
  const step = (now) => {
    if (!started) started = now;
    const t = Math.min(1, (now - started) / duration);
    update(ease(t));
    if (t < 1) requestAnimationFrame(step);
    else resolve();
  };
  requestAnimationFrame(step);
});
const BEATS = [
  { count: 10, height: 1714.8, y: -758, level: -758, target: 856 },
  { count: 11, height: 1886.8, y: -844, level: -844, target: 942 },
  { count: 12, height: 2059.8, y: -930, level: -930, target: 1028 },
  { count: 13, height: 2231.8, y: -1016, level: -1016, target: 1114 },
  { count: 14, height: 2403.8, y: -1102, level: -1102, target: 1200 },
  { count: 15, height: 2575.8, y: -1188, level: -1188, target: 1286 },
  { count: 16, height: 2747.8, y: -1274, level: -1274, target: 1372 },
  { count: 17, height: 2919.8, y: -1360, level: -1360, target: 1458 },
  { count: 18, height: 3091.8, y: -1446, level: -1446, target: 1544 },
  { count: 19, height: 3263.8, y: -1532, level: -1532, target: 1630 }
];
const easeOutCirc = (t) => Math.sqrt(1 - (t - 1) * (t - 1));
const easeOutBack = (amount) => (t) => {
  const shifted = t - 1;
  return shifted * shifted * ((amount + 1) * shifted + amount) + 1;
};
const zoomAnimation = (symbol) => {
  if (symbol === 18) return "yellow_hat_zoom";
  if (symbol === 14) return "yellow_hat_horizontal";
  if (symbol === 15) return "yellow_hat_vertical";
  if (symbol === 17) return "green_hat_zoom";
  return "";
};

async function playSpecialSymbolReveal(game, entry, result) {
  const { atlases, spines } = game;
  const ownedSpines = [];
  const point = game.reels.positionOf(entry.position);
  const unit = game.girder.unit;
  const root = new Container();
  root.name = "gigComponent";
  root.label = "MysteryRevealAtOriginatingCell";
  root.position.set(point.x + 52 * unit, point.y + 50 * unit);
  root.scale.set(unit);
  // The original reveal is inserted into the reel hierarchy. Board-space
  // parenting preserves both the source +52/+50 offset and the cell position
  // while the desktop board camera changes scale.
  game.boardEffects.addChild(root);
  const updateDebug = (phase, active = true) => {
    const cellCenter = game.boardCamera.toGlobal({ x: point.x, y: point.y });
    const revealOrigin = root.destroyed ? { x: 0, y: 0 } : root.getGlobalPosition();
    const expectedOrigin = game.boardCamera.toGlobal({ x: point.x + 52 * unit, y: point.y + 50 * unit });
    const debug = {
      active,
      phase,
      position: { ...entry.position },
      cellCenter,
      revealOrigin,
      expectedOrigin,
      drift: Math.hypot(revealOrigin.x - expectedOrigin.x, revealOrigin.y - expectedOrigin.y),
      parent: root.parent?.label || null,
      cellVisible: !game.reels.hiddenCells.has(`${entry.position.reel}:${entry.position.row}`),
      settledSymbol: game.reels.columns[entry.position.reel].ids[entry.position.row + 1],
      replacementOverlay: game.symbolOverlays.some((overlay) =>
        overlay.position.reel === entry.position.reel &&
        overlay.position.row === entry.position.row &&
        overlay.symbol === entry.symbol &&
        overlay.object.visible &&
        !overlay.object.destroyed
      )
    };
    window.__MYSTERY_REVEAL_DEBUG__ = debug;
    (window.__MYSTERY_REVEAL_HISTORY__ ||= []).push(debug);
  };
  game.reels.setCellVisible(entry.position, false);
  game.removeSymbolOverlay(entry.position, false);
  updateDebug("flip");

  // Local adapter presentation data. Server integrations supply the original
  // K8 reel codes and xp field instead of deriving them here.
  const codes = [];
  for (let row = 0; row < 6; row++) {
    for (let reel = 0; reel < 5; reel++) {
      const symbol = result.finalGrid[reel][row];
      codes.push(symbol === 18 ? "XX" : symbol === 14 ? "XA" : symbol === 15 ? "XB" : symbol === 17 ? "XD" : "");
    }
  }
  const direction = game.reels.visualRng.chance(0.5) ? 1 : -1;
  const firstGreen = result.specialPositions.find((item) => item.symbol === 17);
  const allowGreen = !firstGreen || firstGreen === entry;
  const fromCode = (code) => {
    if (code === "XX") return "yellow_hat_ideal";
    if (code === "XA") return "yellow_hat_horizontal_ideal";
    if (code === "XB") return "yellow_hat_vertical_ideal";
    if (code === "XD") return allowGreen ? "green_hat_ideal" : "";
    return "";
  };
  const clips = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const code of codes) {
      const clip = fromCode(code);
      if (clip) clips.push(clip);
    }
  }
  const xp = entry.xp ?? 0;
  for (let index = 0; index <= xp; index++) {
    const clip = fromCode(codes[index]);
    if (clip) clips.push(clip);
  }
  if (direction !== -1) {
    if (codes[xp] !== "XX") clips.push("yellow_hat_ideal");
    else clips.push(fromCode(codes[game.reels.visualRng.chance(0.5) ? 1 : 3]));
  }
  const beat = BEATS.find((item) => item.count === clips.length);
  if (!beat) throw new Error(`Original reveal list has no timing row for ${clips.length} symbols`);

  const gig = new Container();
  gig.name = "gigParentContainer";
  const meter = new Container();
  meter.name = "gigMeter";
  const mask = new Graphics().rect(-5, -90, 200, 180).fill(0xffffff);
  meter.addChild(mask);
  meter.mask = mask;
  const list = new Container();
  list.name = "gigContainer";
  list.y = beat.level;
  meter.addChild(list);
  gig.addChild(meter);
  const frame = new Sprite(atlases.symbols.texture("small_frame"));
  frame.anchor.set(0.5);
  frame.scale.set(2, 1.8);
  gig.addChild(frame);
  root.addChild(gig);
  gig.alpha = 0;
  clips.reverse().forEach((clip, index) => {
    const spine = spines.create("symbols", clip, true);
    ownedSpines.push(spine);
    spine.name = `gigSymbol_${clip}_${index}`;
    spine.position.set(93, index * 172);
    list.addChild(spine);
  });

  const mystery = new AnimatedSprite(atlases.symbols.animation("mystery_sym"));
  mystery.name = "mysteryReveal";
  mystery.anchor.set(0.5);
  mystery.scale.set(2);
  mystery.animationSpeed = atlases.symbols.fps / 60;
  mystery.loop = false;
  root.addChild(mystery);
  let gigRevealStarted = false;
  mystery.onFrameChange = () => {
    const frameIndex = atlases.symbols.data.animations.mystery_sym.frames[mystery.currentFrame];
    if (!gigRevealStarted && frameIndex >= 230) {
      gigRevealStarted = true;
      void tween(500, (t) => { gig.alpha = t; });
    }
  };
  mystery.play();
  // Original GIG.MysteryFlip fires with the mystery symbol flip.
  game.audio.play("mystery", 0.5);
  await wait(800);
  updateDebug("rolling");
  const directionOffset = entry.symbol === 1 ? -30 : 50 * entry.symbol;
  const settleOffset = entry.symbol === 1 ? 86 : 0;
  const listStart = list.y;
  const listPeak = beat.target + directionOffset;
  await tween(4000, (t) => { list.y = listStart + (listPeak - listStart) * t; }, easeOutCirc);
  await tween(150, (t) => { list.y = listPeak + (beat.target - settleOffset - listPeak) * t; }, easeOutBack(0.1));

  const effect = new Container();
  root.addChild(effect);
  void tween(300, (t) => { frame.alpha = 1 - t; });
  const blast = new AnimatedSprite(atlases.symbolParticle.animation("particle"));
  blast.anchor.set(0.5);
  blast.scale.set(3);
  blast.blendMode = "add";
  blast.animationSpeed = atlases.symbolParticle.fps / 60 * 1.5;
  blast.loop = false;
  effect.addChild(blast);
  blast.play();
  const finalAnimation = zoomAnimation(entry.symbol);
  if (finalAnimation) {
    const final = spines.create("symbols");
    ownedSpines.push(final);
    effect.addChild(final);
    await spines.playWithOptions(final, finalAnimation, { speed: 1.5 });
  }
  game.reels.setSymbol(entry.position, entry.symbol);
  game.reels.setCellVisible(entry.position, true);
  game.createHatOverlay(entry.position, entry.symbol);
  updateDebug("settled");
  for (const spine of ownedSpines) spines.release(spine);
  root.destroy({ children: true });
  const cleaned = {
    active: false,
    phase: "cleaned",
    position: { ...entry.position },
    parent: null,
    drift: 0,
    cellVisible: !game.reels.hiddenCells.has(`${entry.position.reel}:${entry.position.row}`),
    settledSymbol: game.reels.columns[entry.position.reel].ids[entry.position.row + 1],
    replacementOverlay: game.symbolOverlays.some((overlay) =>
      overlay.position.reel === entry.position.reel &&
      overlay.position.row === entry.position.row &&
      overlay.symbol === entry.symbol &&
      overlay.object.visible &&
      !overlay.object.destroyed
    )
  };
  window.__MYSTERY_REVEAL_DEBUG__ = cleaned;
  (window.__MYSTERY_REVEAL_HISTORY__ ||= []).push(cleaned);
  await wait(1000);
}

export { playSpecialSymbolReveal };
