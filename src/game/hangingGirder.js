import { AnimatedSprite, Container, Sprite } from "../../vendor.js";
import { ASSET_DEVICE } from "./atlas.js";
import { SymbolId } from "./types.js";

// Recovered from Z.Tb and Z.Components.c0 in the supplied original bundle.
// The ordering is intentional: the original does not randomly select idle clips.
const BASE_IDLE = {
  pig1: [
    "breathing_with_looking_left_and_right",
    "hand_on_knee_With_blink",
    "breathing_with_looking_left_and_right",
    "Looking_Lft_&_right",
    "Chew_cycle_with_burger",
    "Chew_cycle_with_burger_with_blink",
    "complit_burger_chiew",
    "Chew_cycle_without_burger",
    "Chew_cycle_without _burger_with_blink",
    "leg_dangling"
  ],
  pig2: [
    "napping",
    "looks_left_and_right",
    "looks_left_and_right",
    "napping",
    "back_to_nap",
    "before_naping",
    "before_naping",
    "before_naping",
    "napping",
    "back_to_nap",
    "off_balance",
    "scraching",
    "napping",
    "back_to_nap",
    "before_naping",
    "back_to_nap"
  ],
  pig3: [
    "hand_on_stomach",
    "hand_on_stomach",
    "hand_on_stomach",
    "hand_on_stomach_looking front",
    "hand_on_stomach_looking front",
    "hand_on_stomach_looking_front_with_blink",
    "hand_on_stomach_looking_front_with_blink",
    "laughing",
    "leg_dangling_hand_on_stomach",
    "leg_dangling_hand_on_stomach_blink",
    "leg_dangling_hand_on_stomach_ear_shaking",
    "leg_dangling_hand_on_stomach_scratching"
  ]
};
const FEATURE_IDLE = {
  pig1: ["holding_hammer", "holding_hammer_with_blink", "holding_hammer", "holding_hammer_with_blink", "holding_hammer", "holding_hammer_with_blink"],
  pig2: ["hold _jackhamme_breathing", "hold_ jackhammer_breathing_blink", "hold  jackhammer & breathing & blink_attract", "hold _jackhamme_breathing", "hold_ jackhammer_breathing_blink", "hold  jackhammer & breathing & blink_attract"],
  pig3: ["hold_saw_blade", "hold_saw_blade_blink", "subtle_animation", "hold_saw_blade", "hold_saw_blade_blink", "hold_saw_blade"]
};
const REVERSED_PIG2_CLIPS = new Set([4, 12]);
const REFERENCE_REEL_WIDTH = 523 * 2;
const PORTRAIT_REEL_PARENT_SCALE = 1.025;
const LANDSCAPE_REEL_PARENT_SCALE = 1;
const REELS_COMPONENT_SCALE = 0.98;
const REELS_COMPONENT_Y = -45;
const REELS_CONTENT_HEIGHT = 6 * 166;
const LANDSCAPE_BASE_GIRDER_Y = 0.48;
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
const easeOutBack = (amount) => (t) => {
  const shifted = t - 1;
  return shifted * shifted * ((amount + 1) * shifted + amount) + 1;
};

class HangingGirder {
  constructor(atlases, spines, audio) {
    this.atlases = atlases;
    this.spines = spines;
    this.audio = audio || { play: () => null, playLoop: () => null, stop: () => void 0 };
    this.root = new Container();
    this.root.label = "HangingGirderComponent";
    this.swing = new Container();
    this.ropeBeam = new Container();
    this.pigs = new Container();
    this.root.addChild(this.swing);
    this.swing.addChild(this.ropeBeam, this.pigs);
    this.ropes = new Sprite(atlases.base.texture("girder"));
    this.ropes.anchor.set(0.5);
    this.ropes.label = "hangingGirderRopes";
    this.beam = new Sprite(atlases.base.texture("girder_base"));
    this.beam.anchor.set(0.5);
    this.beam.label = "hangingGirderWoodenBeam";
    this.hats = spines.create("hangingHats");
    this.hats.label = "hangingHats";
    spines.stop(this.hats, "hat_hold");
    this.pig1 = spines.create("pig1");
    this.pig2 = spines.create("pig2");
    this.pig3 = spines.create("pig3");
    this.pig1.label = "hangingPig1";
    this.pig2.label = "hangingPig2";
    this.pig2.rotation = -4 * Math.PI / 180;
    this.pig3.label = "hangingPig3";
    this.ropeBeam.addChild(this.ropes, this.hats, this.beam);
    this.pigs.addChild(this.pig1, this.pig2, this.pig3);
    this.billboardLightsOn = atlases.freespin.texture("billboard_sign_lights_on_portraite");
    this.billboardLightsOff = atlases.freespin.texture("billboard_sign_lights_off_portraite");
    this.billboard = new Sprite(this.billboardLightsOn);
    this.billboard.anchor.set(0.5);
    this.billboard.visible = false;
    this.billboardLit = true;
    this.billboardBlinkTime = 0;
    this.root.addChild(this.billboard);
    this.unit = 1;
    this.swayTime = 0;
    this.swaying = false;
    this.idleGeneration = 0;
    this.featureMode = false;
    this.disposed = false;
    this.startBaseIdle();
  }
  layout(board, screenPortrait = this.screenPortrait ?? board.height > board.width) {
    // Original chain: orientation-specific reelParent scale → reelsComponent
    // (y=-45, scale=.98) → girder. Landscape base state v_ places the
    // component at y=.48 with a zero inner-container offset. Portrait uses
    // y=0. The established feature composition is left unchanged here.
    // Atlas pages are half resolution, hence the additional 2× on images.
    this.board = board;
    this.screenPortrait = screenPortrait;
    const portrait = screenPortrait;
    const reelParentScale = portrait ? PORTRAIT_REEL_PARENT_SCALE : LANDSCAPE_REEL_PARENT_SCALE;
    const parentUnit = board.width / REFERENCE_REEL_WIDTH;
    this.unit = parentUnit * reelParentScale * REELS_COMPONENT_SCALE;
    const reelParentY = board.y + board.height / 2;
    const contentTop = reelParentY + REELS_COMPONENT_Y * parentUnit * reelParentScale - REELS_CONTENT_HEIGHT / 2 * this.unit;
    const baseOffset = !portrait && !this.featureMode ? LANDSCAPE_BASE_GIRDER_Y * REELS_CONTENT_HEIGHT * this.unit : 0;
    const rootY = contentTop + baseOffset;
    this.root.position.set(board.x + board.width / 2, rootY);
    this.idleRootX = this.root.x;
    this.idleRootY = rootY;
    this.ropes.scale.set(2 * this.unit);
    this.ropes.position.set(0, -1050 * this.unit);
    this.beam.scale.set(2 * this.unit);
    this.beam.position.set(0, -152 * this.unit);
    const pigScale = 0.8 * this.unit;
    this.pig1.scale.set(pigScale);
    this.pig2.scale.set(pigScale);
    this.pig3.scale.set(pigScale);
    this.hats.scale.set(pigScale);
    this.pig1.position.set(-165 * this.unit, -165 * this.unit);
    this.pig2.position.set(40 * this.unit, -183 * this.unit);
    this.pig3.position.set(205 * this.unit, -195 * this.unit);
    this.hats.position.set(205 * this.unit, -194 * this.unit);
    // Original Q_.f8 billboard settings: landscape ma=(220,1210), scale=.63;
    // portrait ma=(980,460), scale=.8. Landscape fixed children inhabit the
    // same width-scaled, vertically centred 1920-unit design root as the wolf.
    let signCenterX;
    let signCenterY;
    if (portrait) {
      this.billboard.scale.set(board.width * 0.51 / 334);
      signCenterX = board.x + board.width / 2;
      signCenterY = board.y + board.width * 0.028;
    } else {
      const screenW = (board.x + board.width / 2) * 2;
      const screenH = (board.y + board.height / 2) * 2;
      const designUnit = screenW / 1920;
      const designOffsetY = (screenH - 1920 * designUnit) / 2;
      this.billboard.scale.set((ASSET_DEVICE === "desktop" ? 2 : 1) * 0.63 * designUnit);
      signCenterX = 220 * designUnit;
      signCenterY = designOffsetY + 1210 * designUnit;
    }
    // When the sign is reparented into the behind-reels layer it takes board
    // (game-layer) coordinates directly; inside the girder root it keeps the
    // root-relative offset.
    if (this.billboard.parent && this.billboard.parent !== this.root) {
      this.billboard.position.set(signCenterX, signCenterY);
    } else {
      this.billboard.position.set(signCenterX - (board.x + board.width / 2), signCenterY - rootY);
    }
  }
  async runIdle(name, clips, generation, feature) {
    let index = 0;
    while (!this.disposed && generation === this.idleGeneration) {
      const reverse = name === "pig2" && !feature && REVERSED_PIG2_CLIPS.has(index);
      await this.spines.playWithOptions(this[name], clips[index], { reverse });
      index = (index + 1) % clips.length;
    }
  }
  stopIdle() {
    this.idleGeneration++;
    this.swaying = false;
  }
  startBaseIdle() {
    this.stopIdle();
    this.featureMode = false;
    if (this.board) this.layout(this.board);
    this.billboard.visible = false;
    this.billboardLit = true;
    this.billboard.texture = this.billboardLightsOn;
    this.ropeBeam.visible = true;
    this.pigs.visible = true;
    const generation = this.idleGeneration;
    for (const name of ["pig1", "pig2", "pig3"]) void this.runIdle(name, BASE_IDLE[name], generation, false);
    this.startSway();
  }
  startFeatureIdle() {
    this.stopIdle();
    this.featureMode = true;
    if (this.board) this.layout(this.board);
    this.ropeBeam.visible = false;
    this.pigs.visible = false;
    this.billboard.visible = true;
    this.billboardLit = true;
    this.billboardBlinkTime = 0;
    this.billboard.texture = this.billboardLightsOn;
  }
  async restoreBase() {
    this.stopIdle();
    this.billboard.visible = false;
    this.ropeBeam.visible = true;
    this.pigs.visible = true;
    await Promise.all([
      this.spines.playWithOptions(this.pig3, "last_pose_to_first_pose"),
      this.spines.playWithOptions(this.pig2, "back_to_nap"),
      this.spines.playWithOptions(this.pig1, "sitting_animation")
    ]);
    if (!this.disposed) this.startBaseIdle();
  }
  async throwHats(thrownHats, targetPoint, onLand) {
    window.__GIRDER_STAGE__ = "throw-start";
    const animations = {
      [SymbolId.ScatterD]: "green_supersaw_static",
      [SymbolId.Scatter]: "yellow_hat_static",
      [SymbolId.ScatterA]: "hat_horizontal_static",
      [SymbolId.ScatterB]: "hat_vertical_static",
      [SymbolId.ScatterC]: "white_saw_static"
    };
    const throws = thrownHats.map((thrown) => {
      const sprite = new AnimatedSprite(this.atlases.hats.animation(animations[thrown.symbol]));
      sprite.anchor.set(0.5);
      sprite.scale.set(2 * this.unit * 0.6);
      sprite.position.set(0, -230 * this.unit);
      sprite.gotoAndStop(0);
      this.root.addChild(sprite);
      const globalTarget = targetPoint(thrown.position);
      const target = this.root.toLocal(globalTarget);
      const start = { x: 0, y: -230 };
      const end = { x: target.x / this.unit, y: target.y / this.unit };
      const dx = end.x - start.x;
      const control = {
        x: (start.x + end.x) / 2.2,
        y: Math.min(start.y, end.y) - Math.max(200, 0.1 * Math.abs(dx))
      };
      const duration = Math.round(800 + 0.5 * Math.hypot(dx, end.y - start.y));
      return tween(duration, (t) => {
        const inverse = 1 - t;
        sprite.position.set(
          (inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x) * this.unit,
          (inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y) * this.unit
        );
        const scale = 2 * this.unit * (0.6 + 0.4 * t);
        sprite.scale.set(scale);
        sprite.rotation = 4 * Math.PI * t;
      }).then(async () => {
        await onLand(thrown);
        sprite.destroy();
      });
    });
    // The original awaits the final supplied throw, not an arbitrary delay.
    if (throws.length) await throws[throws.length - 1];
  }
  async playGirderTrigger(thrownHats, targetPoint, onLand) {
    // Pig.StompNHatFall: standing/drilling/kick, then the original hat path.
    this.stopIdle();
    window.__GIRDER_STAGE__ = "drill";
    const drillingDuration = this.spines.duration(this.pig2, "antic_animation_drilling") * 1000;
    const trigger = (async () => {
      await this.spines.playWithOptions(this.pig2, "before_drilling", { speed: 2.5 });
      await wait(500);
      await this.spines.playWithOptions(this.pig2, "antic_animation_bounce");
      this.spines.playWithOptions(this.pig2, "antic_animation_drilling", { startTime: 1 });
      await wait(150);
      this.spines.playWithOptions(this.pig1, "antic_animation");
      await wait(600);
      await this.spines.playWithOptions(this.hats, "antick_animation(when pig's kick the gurder)");
    })();
    this.spines.playWithOptions(this.pig1, "standing_animation", { reverse: true });
    await Promise.all([trigger, wait(drillingDuration)]);
    // Pig.StompNHatFall: the kick that drops the hats off the girder.
    this.audio.play("pigStomp", 0.5);
    await this.throwHats(thrownHats, targetPoint, onLand);
    window.__GIRDER_STAGE__ = "restore";
    // Girder.RaiseShort as the pigs settle back onto the beam.
    this.audio.play("girderRaiseShort", 0.4);
    const restoring = Promise.all([
      this.spines.playWithOptions(this.pig1, "sitting_animation"),
      this.spines.playWithOptions(this.pig2, "back_to_nap")
    ]);
    await wait(1200);
    await restoring;
    if (!this.disposed) {
      this.spines.stop(this.hats, "hat_hold");
      this.startBaseIdle();
      window.__GIRDER_STAGE__ = "done";
    }
  }
  async playMysteryDrop(specialPositions, targetPoint, onPass, portrait) {
    this.stopIdle();
    const airClips = [
      [this.pig1, "Jump_and_heroic_pose"],
      [this.pig2, "antic_in_to_air"],
      [this.pig3, "antick_in_to_air"],
      [this.hats, "idle state_animation(when the pig's antic in to air with woodenbox"]
    ];
    for (const [spine, animation] of airClips) void this.spines.playWithOptions(spine, animation, { speed: 1.5 });
    // Original RS.V uv(): tween to y=-500 over 200ms, then back over 200ms
    // (a there-and-back hop). It is not awaited; the 800ms girder drop starts
    // while the pigs return to the beam, so they land back on the wood as the
    // girder settles over the reels.
    const pigStartY = this.pigs.y;
    void tween(400, (t) => {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      this.pigs.y = pigStartY - 500 * this.unit * phase;
    });
    this.audio.play("girderLower", 0.45);
    await wait(80);
    // mb.zO {x:0,y:580} / nb.zO {x:0,y:1180} are absolute targets in the
    // component space whose v_ home is (0,0) (see FW/TX/x6).
    const dropDistance = portrait ? 1180 : 580;
    const startY = this.root.y;
    const dropY = this.idleRootY + dropDistance * this.unit;
    await tween(800, (t) => { this.root.y = startY + (dropY - startY) * t; }, easeOutBack(1.8));
    await Promise.all([
      this.spines.playWithOptions(this.pig1, "antic_animation_normal_to_ up"),
      this.spines.playWithOptions(this.pig2, "antic_animation_up_to_down"),
      this.spines.playWithOptions(this.pig3, "bounce_01")
    ]);
    const cloud = new AnimatedSprite(this.atlases.constructionCloud.animation("smoke_hat"));
    cloud.anchor.set(0.5);
    cloud.position.set(-30 * this.unit, -370 * this.unit);
    cloud.scale.set(2 * this.unit * 2.7);
    cloud.rotation = 3 * Math.PI / 180;
    cloud.alpha = 0;
    cloud.animationSpeed = this.atlases.constructionCloud.fps / 60 * 0.95;
    cloud.loop = false;
    this.pigs.addChild(cloud);
    cloud.play();
    await tween(300, (t) => { cloud.alpha = t; });
    const targets = specialPositions.map((entry) => {
      const local = this.root.toLocal(targetPoint(entry.position));
      return { entry, y: local.y / this.unit - (this.root.y - this.idleRootY) / this.unit, passed: false };
    }).sort((a, b) => b.y - a.y);
    const raiseStart = this.root.y;
    // Original raise target q: -473 landscape / 0 portrait. The girder climbs
    // past its home and parks high above the reels (fS state); returnHome()
    // brings it back at the end of the spin flow (original x6()).
    const parkedY = this.idleRootY + (portrait ? 0 : -473) * this.unit;
    // Girder.Raise for the slow climb that flips the mystery symbols.
    this.audio.play("girderRaise", 0.45);
    await tween(2500, (t) => {
      this.root.y = raiseStart + (parkedY - raiseStart) * t;
      this.root.rotation = 0;
      const offset = (this.root.y - this.idleRootY) / this.unit;
      for (const target of targets) {
        if (!target.passed && offset - (target.y + 250) <= 20) {
          target.passed = true;
          onPass(target.entry);
        }
      }
    });
    cloud.destroy();
    this.pigs.y = pigStartY;
    this.spines.stop(this.hats, "hat_hold");
    this.root.position.set(this.idleRootX, parkedY);
    await wait(1000);
    await this.restoreBase();
    // restoreBase() → startBaseIdle() → layout() resets the root to the idle
    // position; re-apply the parked offset so the girder stays up high.
    this.root.position.set(this.idleRootX, parkedY);
  }
  async returnHome() {
    // Original x6(): after the outcome presentation the girder sinks back to
    // its normal hanging position over 800ms (linear) with the raise sound.
    if (Math.abs(this.root.y - this.idleRootY) < 1) return;
    const startY = this.root.y;
    this.audio.play("girderRaise", 0.4);
    await tween(800, (t) => { this.root.y = startY + (this.idleRootY - startY) * t; });
    this.root.position.set(this.idleRootX, this.idleRootY);
  }
  startSway() {
    this.swayTime = 0;
    this.swaying = true;
  }
  update(dt) {
    if (this.disposed) return;
    // The sign's marquee alternates between the two supplied light frames
    // while Free Spin is active.
    if (this.featureMode && this.billboard.visible) {
      this.billboardBlinkTime += dt;
      if (this.billboardBlinkTime >= 0.45) {
        this.billboardBlinkTime = 0;
        this.billboardLit = !this.billboardLit;
        this.billboard.texture = this.billboardLit ? this.billboardLightsOn : this.billboardLightsOff;
      }
    }
    if (!this.swaying) return;
    this.swayTime = (this.swayTime + dt) % 10;
    // Four original 2.5-second linear segments: centre → right →
    // centre → left → centre, with rotation -0.7° / 0° / +0.7° / 0°.
    const phase = this.swayTime / 2.5;
    const segment = Math.floor(phase) % 4;
    const eased = phase - Math.floor(phase);
    const fromX = [0, 15, 0, -15][segment];
    const toX = [15, 0, -15, 0][segment];
    const fromAngle = [0, -0.7, 0, 0.7][segment];
    const toAngle = [-0.7, 0, 0.7, 0][segment];
    this.swing.x = (fromX + (toX - fromX) * eased) * this.unit;
    this.swing.rotation = (fromAngle + (toAngle - fromAngle) * eased) * Math.PI / 180;
  }
  dispose() {
    this.disposed = true;
    this.stopIdle();
    for (const spine of [this.pig1, this.pig2, this.pig3, this.hats]) this.spines.release(spine);
    this.root.destroy({ children: true });
  }
}

export { BASE_IDLE, FEATURE_IDLE, HangingGirder };
