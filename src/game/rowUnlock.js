import { AnimatedSprite, Container, Graphics } from "../../vendor.js";
import { ASSET_DEVICE } from "./atlas.js";

// Recovered from Z.Components.RK. All timings and clip names are source-driven.
const easeOutBack = (t, overshoot) => {
  const shifted = t - 1;
  return shifted * shifted * ((overshoot + 1) * shifted + overshoot) + 1;
};
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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const animationComplete = (sprite) => new Promise((resolve) => {
  let finished = false;
  const complete = () => {
    if (finished) return;
    finished = true;
    resolve();
  };
  sprite.onComplete = complete;
  const observe = () => {
    if (finished) return;
    if (!sprite.playing) complete();
    else requestAnimationFrame(observe);
  };
  requestAnimationFrame(observe);
});

class RowUnlockSequence {
  constructor(app, atlases, spines, reels, layer, audio, spinButton = null, boardCamera = null) {
    this.app = app;
    this.atlases = atlases;
    this.spines = spines;
    this.reels = reels;
    this.spinButton = spinButton;
    this.boardCamera = boardCamera;
    this.audio = audio || { play: () => null, playLoop: () => null, stop: () => void 0 };
    this.root = new Container();
    this.root.label = "OriginalRowUnlockSequence";
    // The pig rises from behind the bottom green panel (balance/bet/win UI),
    // so this layer is inserted between the game layer and the UI layer.
    layer.addChild(this.root);
  }
  async play(unlockedRows, activeRowsAfter, firstHatReel) {
    window.__ROW_SEQUENCE_STAGE__ = "enter";
    window.__ROW_SEQUENCE_DEBUG__ = null;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const portrait = h / w > 1.18;
    const desktopLandscape = ASSET_DEVICE === "desktop" && !portrait;
    const unit = portrait ? w / 1080 : Math.min(w / 1920, h / 1080);
    const pig = this.spines.create("blastingPig");
    pig.label = "OriginalBlastingPig";
    pig.scale.set(0.7 * unit * (portrait ? 1.01 : 1));
    pig.position.set(w / 2, 0);
    this.spines.stop(pig, "right_before_presses_down");
    this.root.addChild(pig);
    const initialBounds = pig.getLocalBounds();
    const footOffset = (initialBounds.y + initialBounds.height) * pig.scale.y;
    const headOffset = initialBounds.y * pig.scale.y;
    // The control is disabled and can be hidden during presentation, when
    // getBounds() is empty. Its responsive position and scaled texture still
    // describe the exact button surface on which the pig must stand.
    const buttonSprite = this.spinButton?.sprite;
    const buttonWidth = buttonSprite ? buttonSprite.texture.width * Math.abs(buttonSprite.scale.x) : 0;
    const buttonHeight = buttonSprite ? buttonSprite.texture.height * Math.abs(buttonSprite.scale.y) : 0;
    const buttonBounds = this.spinButton && buttonSprite ? {
      x: this.spinButton.x - buttonWidth / 2,
      y: this.spinButton.y - buttonHeight / 2,
      width: buttonWidth,
      height: buttonHeight
    } : null;
    const targetX = desktopLandscape ? w / 2 : buttonBounds ? buttonBounds.x + buttonBounds.width / 2 : w / 2;
    const buttonSurfaceY = buttonBounds ? buttonBounds.y + buttonBounds.height * 0.08 : 0;
    const endY = desktopLandscape
      ? h / 2 + 560 * unit
      : buttonBounds
        ? buttonSurfaceY - footOffset
        : h / 2 + (portrait ? 640 : 560) * unit;
    const startY = desktopLandscape
      ? h / 2 + 900 * unit
      : Math.max(
        h / 2 + (portrait ? 1100 : 900) * unit,
        h - headOffset + 20
      );
    pig.position.set(targetX, startY);
    if (firstHatReel === 4) await wait(400);
    // BlastingPigAppear as the demolition pig rises into view.
    this.audio.play("blastingPig", 0.5);
    await tween(1000, (t) => { pig.y = startY + (endY - startY) * t; }, (t) => easeOutBack(t, 0.8));
    // The original sequence waits for the pig's complete press animation before
    // firing the row blast event. Keep it in the held pose through every blast;
    // the common exit below runs only after the final selected row completes.
    window.__ROW_SEQUENCE_STAGE__ = "press";
    await this.spines.playWithOptions(pig, "right_before_presses_down");
    window.__ROW_SEQUENCE_STAGE__ = "hold";
    this.spines.playWithOptions(pig, "stays_down");
    const heldBounds = pig.getLocalBounds();
    if (buttonBounds && !desktopLandscape) pig.y = buttonSurfaceY - (heldBounds.y + heldBounds.height) * pig.scale.y;
    window.__ROW_SEQUENCE_DEBUG__ = {
      stage: "hold",
      pig: {
        x: pig.x,
        y: pig.y,
        bounds: {
          x: pig.x + heldBounds.x * pig.scale.x,
          y: pig.y + heldBounds.y * pig.scale.y,
          width: heldBounds.width * Math.abs(pig.scale.x),
          height: heldBounds.height * Math.abs(pig.scale.y)
        }
      },
      spinButton: buttonBounds
    };
    // Locked rows sit at the TOP of the stored grid (rows 0..ROWS-activeRows-1).
    // Blast from the lowest locked row upward, one row at a time.
    const activeRowsBefore = activeRowsAfter - unlockedRows;
    const firstLockedRow = 6 - activeRowsBefore - 1;
    // RowBlastingBackground under the whole blasting sequence.
    this.audio.play("rowBlastBackground", 0.4);
    for (let index = 0; index < unlockedRows; index++) {
      const lockRow = firstLockedRow - index;
      // Blast centred on the exact row being unlocked (rowsBlast atlas),
      // derived from the live reel geometry so any row count aligns.
      const innerX = this.reels.width * 13 / 523;
      const innerY = this.reels.height * 30 / 603;
      const innerH = this.reels.height * 494 / 603;
      const cellH = innerH / 6;
      const blastX = this.reels.x + innerX + (this.reels.width * 497 / 523) / 2 + (portrait ? 0 : -1 * unit);
      const blastY = this.reels.y + innerY + (lockRow + 0.5) * cellH;
      const blast = new AnimatedSprite(this.atlases.rowsBlast.animation("blast_collaps"));
      blast.label = `OriginalRowBlast${lockRow}`;
      blast.anchor.set(0.5);
      blast.position.set(blastX, blastY);
      blast.scale.set(2 * unit * (portrait ? 1.01 : 1));
      blast.animationSpeed = this.atlases.rowsBlast.fps / 60 * 1.2;
      blast.loop = false;
      // Blast coordinates remain in board design space; the desktop camera
      // therefore scales and positions the explosion with the locked row.
      (this.boardCamera || this.root).addChild(blast);
      window.__ROW_SEQUENCE_STAGE__ = `blast-${lockRow}`;
      const completed = animationComplete(blast);
      // Start the visible explosion first, then fire its sound and remove the
      // lock in the same render turn. Nothing disappears before the blast.
      blast.gotoAndPlay(3);
      this.audio.play("rowBlast", 0.5);
      this.reels.locks[lockRow].visible = false;
      const flash = new Graphics().rect(0, 0, w, h).fill(16777215);
      flash.alpha = 0;
      this.root.addChild(flash);
      void tween(600, (t) => { flash.alpha = 0.3 * t; }).then(() => tween(600, (t) => { flash.alpha = 0.3 * (1 - t); })).then(() => flash.destroy());
      await completed;
      blast.destroy();
    }
    window.__ROW_SEQUENCE_STAGE__ = "exit";
    await tween(1000, (t) => { pig.y = endY + (startY - endY) * t; });
    await wait(1000);
    this.spines.release(pig);
    this.root.destroy({ children: true });
    window.__ROW_SEQUENCE_STAGE__ = "done";
  }
}

export { RowUnlockSequence };
