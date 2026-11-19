var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const TRANSITIONS = {
  title: ["playing"],
  playing: ["paused", "gameover", "title"],
  paused: ["playing", "title"],
  gameover: ["playing", "title"]
};
class GameStateMachine {
  constructor() {
    __publicField(this, "_state", "title");
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
  }
  get state() {
    return this._state;
  }
  is(...states) {
    return states.includes(this._state);
  }
  /** Illegal transitions throw — soft-locks surface here first. */
  transition(next) {
    const prev = this._state;
    if (prev === next) return;
    if (!TRANSITIONS[prev].includes(next)) {
      throw new Error(`illegal state transition: ${prev} -> ${next}`);
    }
    this._state = next;
    for (const fn of this.listeners) fn(next, prev);
  }
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
export {
  GameStateMachine
};
