var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const _GameLoop = class _GameLoop {
  constructor(hooks) {
    __publicField(this, "hooks", hooks);
    // never catch up more than 250ms after a stall, to prevent the spiral of death
    __publicField(this, "acc", 0);
    __publicField(this, "last", 0);
    __publicField(this, "raf", 0);
    __publicField(this, "running", false);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      let delta = (now - this.last) / 1e3;
      this.last = now;
      if (delta > _GameLoop.MAX_FRAME) delta = _GameLoop.MAX_FRAME;
      this.acc += delta;
      while (this.acc >= _GameLoop.STEP) {
        this.hooks.update(_GameLoop.STEP);
        this.acc -= _GameLoop.STEP;
      }
      this.hooks.render(this.acc / _GameLoop.STEP);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
};
/** Fixed step: 60Hz. */
__publicField(_GameLoop, "STEP", 1 / 60);
__publicField(_GameLoop, "MAX_FRAME", 0.25);
let GameLoop = _GameLoop;
export {
  GameLoop
};
