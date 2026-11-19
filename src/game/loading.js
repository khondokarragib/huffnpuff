var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Container, Graphics, Rectangle, Sprite, Text, TextStyle } from "../../vendor.js";
import { fitSpine } from "./spine.js";

const TIP_HOLD = 4.7;
const TIP_TRANSITION = 1;
const TIP_FRAMES = ["screen_a", "screen_c", "screen_b"];
const TIP_TEXT = [
  "UPGRADE YOUR WINS\nWITH THE SUPER SAW\nFEATURE!!!",
  "",
  "UNLOCK\nADDITIONAL ROWS!"
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

function loadingText(text, size = 64, width = 900) {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: "Arial Black, Arial, Helvetica, sans-serif",
      fontSize: size,
      lineHeight: size * 1.25,
      fontWeight: "900",
      fill: 16769445,
      align: "center",
      stroke: { color: 0, width: 2 },
      dropShadow: { color: 0, blur: 3, distance: 3, alpha: 0.85 },
      wordWrap: true,
      wordWrapWidth: width
    })
  });
}

function freeSpinsText(atlas) {
  const root = new Container();
  const rows = [
    ["6 OR MORE ", "yellow_hat", " , ", "hat_horizontal_saw", " ,"],
    ["hat_vertical_saw", " AND/OR ", "special_hat"],
    ["TRIGGERS"],
    ["THE FREE SPINS FEATURE!"]
  ];
  rows.forEach((parts, rowIndex) => {
    const row = new Container();
    let width = 0;
    const gap = 9;
    const items = parts.map((part) => {
      let item;
      if (["yellow_hat", "hat_horizontal_saw", "hat_vertical_saw", "special_hat"].includes(part)) {
        item = new Sprite(atlas.texture(part));
        item.anchor.set(0, 0.5);
        item.height = 84;
        item.scale.x = item.scale.y;
      } else {
        item = loadingText(part, 64, 1100);
        item.anchor.set(0, 0.5);
      }
      width += item.width + gap;
      row.addChild(item);
      return item;
    });
    width -= gap;
    let x = -width / 2;
    for (const item of items) {
      item.x = x;
      x += item.width + gap;
    }
    row.y = rowIndex * 96;
    root.addChild(row);
  });
  root.pivot.y = 144;
  return root;
}

class LoadingScreen {
  constructor(app, backgroundTexture, atlas, spines) {
    __publicField(this, "app", app);
    __publicField(this, "atlas", atlas);
    __publicField(this, "spines", spines);
    __publicField(this, "root", new Container());
    __publicField(this, "background", new Sprite(backgroundTexture));
    __publicField(this, "logo");
    __publicField(this, "tips", []);
    __publicField(this, "footer", new Sprite(atlas.texture("sgifaceplate")));
    // The footer plate texture carries a thin transparent stick slot; the
    // yellow loadbar fills that slot. No separate chunky track is drawn.
    __publicField(this, "barFill", new Sprite(atlas.texture("loadbar")));
    __publicField(this, "barMask", new Graphics());
    __publicField(this, "progress", 0);
    __publicField(this, "displayedProgress", 0);
    // After loading completes a pulsing text invites a tap anywhere; no button.
    __publicField(this, "continueText", loadingText("TAP ANYWHERE TO CONTINUE", 40, 900));
    __publicField(this, "continueResolve", null);
    __publicField(this, "waitingForContinue", false);
    __publicField(this, "barX", 0);
    __publicField(this, "barY", 0);
    __publicField(this, "barW", 1);
    __publicField(this, "barH", 1);
    __publicField(this, "tipStarted", performance.now());
    __publicField(this, "transitionStarted", 0);
    __publicField(this, "currentTip", 0);
    __publicField(this, "transitioning", false);
    __publicField(this, "disposed", false);
    __publicField(this, "tick", (ticker) => this.update(ticker.deltaMS / 1000));
    __publicField(this, "resizeFrame", 0);
    __publicField(this, "onResize", () => {
      if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = 0;
        if (this.disposed) return;
        this.app.resize();
        this.layout();
      });
    });
    this.background.anchor.set(0.5);
    this.logo = spines.create("logo", "idle");
    this.footer.anchor.set(0, 0);
    this.barFill.anchor.set(0, 0.5);
    this.barFill.mask = this.barMask;
    this.continueText.anchor.set(0.5);
    this.continueText.style.fontFamily = "Arial, Helvetica, sans-serif";
    this.continueText.style.fontWeight = "400";
    this.continueText.style.stroke = null;
    this.continueText.style.dropShadow = null;
    this.continueText.visible = false;
    this.root.hitArea = new Rectangle();
    this.root.eventMode = "none";
    this.root.on("pointertap", () => {
      if (!this.waitingForContinue || !this.continueResolve) return;
      this.waitingForContinue = false;
      this.root.eventMode = "none";
      this.root.cursor = "default";
      window.__LOADING_READY__ = false;
      const resolve = this.continueResolve;
      this.continueResolve = null;
      resolve();
    });
    this.root.addChild(this.background, this.logo);
    TIP_FRAMES.forEach((frame, index) => {
      const tip = new Container();
      const screen = new Sprite(atlas.texture(frame));
      screen.anchor.set(0.5);
      const text = index === 1 ? freeSpinsText(atlas) : loadingText(TIP_TEXT[index]);
      if (index !== 1) text.anchor.set(0.5);
      tip.addChild(screen, text);
      tip.visible = index === 0;
      this.tips.push({ root: tip, screen, text });
      this.root.addChild(tip);
    });
    this.root.addChild(this.footer, this.barFill, this.barMask, this.continueText);
    this.app.stage.addChild(this.root);
    this.layout();
    this.app.ticker.add(this.tick);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    window.visualViewport?.addEventListener("resize", this.onResize);
    window.__LOADING_TIP__ = 1;
    window.__LOADING_READY__ = false;
    this.setProgress(0);
  }
  layout() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.root.hitArea.width = w;
    this.root.hitArea.height = h;
    const portrait = h / w > 1.18;
    const unit = portrait ? Math.min(w / 1080, h / 1920) : Math.min(w / 1920, h / 1080);
    const bgScale = Math.max(w / this.background.texture.width, h / this.background.texture.height);
    this.background.scale.set(bgScale);
    this.background.position.set(w / 2, h / 2);
    // Supplied splash reference: landscape logo sits upper-RIGHT, with the
    // tip text beneath it; portrait keeps the logo top-center.
    fitSpine(this.logo, portrait ? w * 0.7 : Math.min(w * 0.38, h * 0.62), portrait ? h * 0.22 : h * 0.34);
    this.logo.position.set(portrait ? w / 2 : w * 0.78, portrait ? h * 0.15 : h * 0.29);
    const imageX = portrait ? [0.45, 0.49, 0.49] : [0.24, 0.3, 0.23];
    const imageY = portrait ? [0.5, 0.5, 0.5] : [0.59, 0.5, 0.53];
    const textX = portrait ? [0.5, 0.5, 0.5] : [0.72, 0.72, 0.68];
    // The Free Spins tips text sits fully above the green footer plate.
    const textY = portrait ? [0.8, 0.775, 0.83] : [0.62, 0.62, 0.65];
    this.tips.forEach((tip, index) => {
      const width = portrait ? w * [1.08, 0.66, 0.82][index] : w * [0.35, 0.29, 0.32][index];
      const maxHeight = h * (portrait ? [0.32, 0.37, 0.38][index] : [0.53, 0.57, 0.57][index]);
      const scale = Math.min(width / tip.screen.texture.width, maxHeight / tip.screen.texture.height);
      tip.screen.scale.set(scale);
      tip.screen.position.set(w * imageX[index], h * imageY[index]);
      tip.text.scale.set(unit);
      tip.text.position.set(w * textX[index], h * textY[index]);
    });
    const footerH = portrait ? Math.max(64, h * 0.065) : Math.max(62, h * 0.1);
    this.footer.position.set(0, h - footerH);
    this.footer.width = w;
    this.footer.height = footerH;
    // Indicator geometry follows the transparent stick slot inside the
    // sgifaceplate texture: 243x10 of 960x79, centred at (0.5, 0.5127).
    this.barW = w * 0.2531;
    this.barH = Math.max(3, footerH * 0.1266);
    this.barX = w * 0.5;
    this.barY = h - footerH + footerH * 0.5127;
    this.barFill.width = this.barW;
    this.barFill.height = this.barH;
    this.barFill.position.set(this.barX - this.barW / 2, this.barY);
    // Small regular prompt inside the blue footer, immediately above the
    // loading indicator, matching the supplied desktop/mobile references.
    this.continueText.text = portrait ? "TAP ANYWHERE TO CONTINUE" : "CLICK ANYWHERE TO CONTINUE";
    this.continueText.position.set(w / 2, this.barY - footerH * 0.22);
    this.continueText.style.fontSize = portrait
      ? Math.max(11, Math.min(16, w * 0.035))
      : Math.max(11, Math.min(20, w * 0.015));
    this.continueText.style.lineHeight = this.continueText.style.fontSize * 1.2;
    this.setProgress(this.progress);
  }
  setProgress(percent) {
    this.progress = clamp(percent, 0, 100);
    const width = this.barW * this.displayedProgress / 100;
    this.barMask.clear().rect(this.barX - this.barW / 2, this.barY - this.barH * 1.2, width, this.barH * 2.4).fill(16777215);
    window.__LOADING_PROGRESS__ = Math.round(this.progress);
  }
  waitForContinue() {
    // No splash button: a pulsing text asks for a tap anywhere to continue.
    this.continueText.visible = true;
    this.waitingForContinue = true;
    this.root.eventMode = "static";
    this.root.cursor = "pointer";
    window.__LOADING_READY__ = true;
    return new Promise((resolve) => {
      this.continueResolve = resolve;
    });
  }
  update(dt) {
    if (this.disposed) return;
    this.spines.update(Math.min(dt, 0.05));
    // Ease the stick fill towards the real progress for a smooth animation.
    if (this.displayedProgress !== this.progress) {
      const before = this.displayedProgress;
      this.displayedProgress += (this.progress - this.displayedProgress) * Math.min(1, dt * 6);
      if (Math.abs(this.progress - this.displayedProgress) < 0.3) this.displayedProgress = this.progress;
      if (before !== this.displayedProgress) this.setProgress(this.progress);
    }
    const now = performance.now();
    if (this.waitingForContinue) this.continueText.alpha = 0.72 + Math.sin(now / 260) * 0.28;
    const w = this.app.screen.width;
    if (!this.transitioning && now - this.tipStarted >= TIP_HOLD * 1000) {
      this.transitioning = true;
      this.transitionStarted = now;
      const next = (this.currentTip + 1) % this.tips.length;
      this.tips[next].root.visible = true;
      // Tips slide in from the left and exit to the right.
      this.tips[next].root.x = -w;
    }
    if (this.transitioning) {
      const t = clamp((now - this.transitionStarted) / (TIP_TRANSITION * 1000), 0, 1);
      const offset = easeInOut(t) * w;
      const next = (this.currentTip + 1) % this.tips.length;
      this.tips[this.currentTip].root.x = offset;
      this.tips[next].root.x = offset - w;
      if (t >= 1) {
        this.tips[this.currentTip].root.visible = false;
        this.tips[this.currentTip].root.x = 0;
        this.currentTip = next;
        this.tips[this.currentTip].root.x = 0;
        this.tipStarted = now;
        this.transitioning = false;
        window.__LOADING_TIP__ = this.currentTip + 1;
      }
    }
  }
  showError(message) {
    this.tips.forEach((tip) => {
      tip.root.visible = false;
    });
    const failure = loadingText(`Unable to load the game.\n${message}`, 30, 900);
    failure.anchor.set(0.5);
    failure.position.set(this.app.screen.width / 2, this.app.screen.height * 0.58);
    failure.scale.set(Math.min(1, this.app.screen.width / 700));
    this.root.addChild(failure);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    this.waitingForContinue = false;
    this.continueResolve = null;
    window.__LOADING_READY__ = false;
    this.app.ticker.remove(this.tick);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
    this.logo.parent?.removeChild(this.logo);
    this.spines.release(this.logo);
    this.root.destroy({ children: true });
  }
}

export { LoadingScreen };
