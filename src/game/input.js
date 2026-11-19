var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { INPUT_CONFIG } from "./config.js";
const KEYMAP = {
  KeyW: ["moveZ", 1],
  ArrowUp: ["moveZ", 1],
  KeyS: ["moveZ", -1],
  ArrowDown: ["moveZ", -1],
  KeyA: ["moveX", -1],
  ArrowLeft: ["moveX", -1],
  KeyD: ["moveX", 1],
  ArrowRight: ["moveX", 1]
};
class Input {
  constructor(target = document.body) {
    __publicField(this, "target", target);
    /** Normalized movement axes: moveX ∈ [-1,1] (left negative, right positive), moveZ ∈ [-1,1] (backward negative, forward positive). */
    __publicField(this, "moveX", 0);
    __publicField(this, "moveZ", 0);
    /** Camera delta for this frame (radians). Multiply by sensitivity and INVERT config when applying. */
    __publicField(this, "yawDelta", 0);
    __publicField(this, "pitchDelta", 0);
    /** Instantaneous actions (true on the frame the key is pressed; auto-cleared once consumed). */
    __publicField(this, "actions", /* @__PURE__ */ new Set());
    __publicField(this, "held", /* @__PURE__ */ new Set());
    __publicField(this, "touchMoveId", null);
    __publicField(this, "touchAimId", null);
    __publicField(this, "touchMoveOrigin", { x: 0, y: 0 });
    __publicField(this, "touchAimOrigin", { x: 0, y: 0 });
    /** Listener teardown — collected at construction so dispose() can unwind every subscription. */
    __publicField(this, "unsubscribe", []);
    const on = (el, type, fn, opts) => {
      const handler = fn;
      el.addEventListener(type, handler, opts);
      this.unsubscribe.push(() => el.removeEventListener(type, handler, opts));
    };
    on(window, "keydown", (e) => {
      if (e.repeat) return;
      const m = KEYMAP[e.code];
      if (m) this.held.add(e.code);
      this.actions.add(e.code);
      this.recomputeAxes();
    });
    on(window, "keyup", (e) => {
      this.held.delete(e.code);
      this.recomputeAxes();
    });
    on(window, "blur", () => this.resetAll());
    on(document, "visibilitychange", () => {
      if (document.hidden) this.resetAll();
    });
    on(window, "mousemove", (e) => {
      if (document.pointerLockElement || e.buttons > 0) {
        const sx = INPUT_CONFIG.MOUSE_SENS_X * (INPUT_CONFIG.INVERT_X ? -1 : 1);
        const sy = INPUT_CONFIG.MOUSE_SENS_Y * (INPUT_CONFIG.INVERT_Y ? -1 : 1);
        this.yawDelta -= e.movementX * sx;
        this.pitchDelta += -e.movementY * sy;
      }
    });
    on(target, "touchstart", (e) => this.onTouch(e, true), { passive: true });
    on(target, "touchmove", (e) => this.onTouch(e, false), { passive: true });
    on(target, "touchend", (e) => this.onTouchEnd(e), { passive: true });
    on(target, "touchcancel", (e) => this.onTouchEnd(e), { passive: true });
  }
  /** Detach every listener and zero the axes — call it when the game is unmounted (see src/game/boot.ts). */
  dispose() {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.actions.clear();
    this.resetAll();
  }
  onTouch(e, start) {
    const w = window.innerWidth;
    for (const t of Array.from(e.changedTouches)) {
      if (start) {
        if (t.clientX < w / 2 && this.touchMoveId === null) {
          this.touchMoveId = t.identifier;
          this.touchMoveOrigin = { x: t.clientX, y: t.clientY };
        } else if (t.clientX >= w / 2 && this.touchAimId === null) {
          this.touchAimId = t.identifier;
          this.touchAimOrigin = { x: t.clientX, y: t.clientY };
        }
      } else if (t.identifier === this.touchMoveId) {
        this.moveX = clamp((t.clientX - this.touchMoveOrigin.x) / 60, -1, 1);
        this.moveZ = clamp(-(t.clientY - this.touchMoveOrigin.y) / 60, -1, 1);
      } else if (t.identifier === this.touchAimId) {
        const sx = INPUT_CONFIG.MOUSE_SENS_X * (INPUT_CONFIG.INVERT_X ? -1 : 1);
        const sy = INPUT_CONFIG.MOUSE_SENS_Y * (INPUT_CONFIG.INVERT_Y ? -1 : 1);
        this.yawDelta -= (t.clientX - this.touchAimOrigin.x) * sx * 0.5;
        this.pitchDelta += -(t.clientY - this.touchAimOrigin.y) * sy * 0.5;
        this.touchAimOrigin = { x: t.clientX, y: t.clientY };
      }
    }
  }
  onTouchEnd(e) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.touchMoveId) {
        this.touchMoveId = null;
        this.recomputeAxes();
      } else if (t.identifier === this.touchAimId) {
        this.touchAimId = null;
      }
    }
  }
  resetAll() {
    this.held.clear();
    this.touchMoveId = null;
    this.touchAimId = null;
    this.yawDelta = 0;
    this.pitchDelta = 0;
    this.recomputeAxes();
  }
  recomputeAxes() {
    let x = 0, z = 0;
    for (const code of this.held) {
      const m = KEYMAP[code];
      if (m) {
        if (m[0] === "moveX") x += m[1];
        else z += m[1];
      }
    }
    this.moveX = clamp(x, -1, 1);
    this.moveZ = clamp(z, -1, 1);
  }
  /** Consume the camera delta before each frame render (take and zero it). */
  consumeLook() {
    const r = { yaw: this.yawDelta, pitch: this.pitchDelta };
    this.yawDelta = 0;
    this.pitchDelta = 0;
    return r;
  }
  /** Consume an instantaneous action: was this key pressed during the current frame. */
  consumeAction(code) {
    const has = this.actions.has(code);
    if (has) this.actions.delete(code);
    return has;
  }
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export {
  Input
};
