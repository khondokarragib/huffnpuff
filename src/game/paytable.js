var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Container, Graphics, Sprite, Text, TextStyle } from "../../vendor.js";
import { money, PAYTABLE_AT_2, SYMBOL_NAMES } from "./config.js";
import { symbolTexture } from "./reels.js";
import { SymbolId } from "./types.js";
const white = new TextStyle({ fontFamily: "Arial, sans-serif", fontSize: 28, fill: 16777215 });
const small = new TextStyle({ fontFamily: "Arial, sans-serif", fontSize: 23, fill: 16777215 });
const title = new TextStyle({ fontFamily: "Arial, sans-serif", fontSize: 38, fill: 16777215 });
class Paytable {
  constructor(atlases, onClose) {
    __publicField(this, "atlases", atlases);
    __publicField(this, "root", new Container());
    __publicField(this, "shade", new Graphics());
    __publicField(this, "header", new Graphics());
    __publicField(this, "footer", new Graphics());
    __publicField(this, "viewport", new Container());
    __publicField(this, "content", new Container());
    __publicField(this, "mask", new Graphics());
    __publicField(this, "logo");
    __publicField(this, "close", new Sprite(atlases.settings.texture("close")));
    __publicField(this, "back", new Sprite(atlases.settings.texture("back")));
    __publicField(this, "balanceText", new Text({ text: "", style: small }));
    __publicField(this, "betText", new Text({ text: "", style: small }));
    __publicField(this, "winText", new Text({ text: "Win", style: small }));
    __publicField(this, "scrollTrack", new Graphics());
    __publicField(this, "scrollThumb", new Graphics());
    __publicField(this, "balance", 1e3);
    __publicField(this, "bet", 2);
    __publicField(this, "width", 720);
    __publicField(this, "height", 1280);
    __publicField(this, "headerH", 84);
    __publicField(this, "footerH", 72);
    __publicField(this, "scale", 1);
    __publicField(this, "scrollY", 0);
    __publicField(this, "dragging", false);
    __publicField(this, "dragY", 0);
    __publicField(this, "dragScroll", 0);
    __publicField(this, "contentHeight", 2520);
    this.root.visible = false;
    this.root.eventMode = "static";
    this.logo = new Sprite(atlases.base.texture("Logo"));
    this.logo.anchor.set(0.5);
    this.back.anchor.set(0.5);
    this.close.anchor.set(0.5);
    for (const button of [this.back, this.close]) {
      button.eventMode = "static";
      button.cursor = "pointer";
      button.on("pointertap", () => {
        this.closeOverlay();
        onClose();
      });
    }
    this.viewport.addChild(this.content);
    this.viewport.mask = this.mask;
    this.root.addChild(this.shade, this.header, this.footer, this.viewport, this.mask, this.logo, this.back, this.close, this.balanceText, this.winText, this.betText, this.scrollTrack, this.scrollThumb);
    this.buildContent();
    this.root.on("wheel", (event) => {
      this.scrollY += event.deltaY / this.scale;
      this.applyScroll();
    });
    this.root.on("pointerdown", (event) => {
      if (event.global.y < this.headerH || event.global.y > this.height - this.footerH) return;
      this.dragging = true;
      this.dragY = event.global.y;
      this.dragScroll = this.scrollY;
    });
    this.root.on("pointermove", (event) => {
      if (!this.dragging) return;
      this.scrollY = this.dragScroll - (event.global.y - this.dragY) / this.scale;
      this.applyScroll();
    });
    const end = () => {
      this.dragging = false;
    };
    this.root.on("pointerup", end).on("pointerupoutside", end).on("pointercancel", end);
  }
  text(value, x, y, style = small, anchor = 0) {
    const text = new Text({ text: value, style });
    text.position.set(x, y);
    text.anchor.set(anchor, 0);
    this.content.addChild(text);
    return text;
  }
  symbol(symbol, x, y, maxW = 145, maxH = 120) {
    const sprite = new Sprite(symbolTexture(this.atlases, symbol));
    sprite.anchor.set(0.5);
    const scale = Math.min(maxW / sprite.texture.width, maxH / sprite.texture.height);
    sprite.scale.set(scale);
    sprite.position.set(x, y);
    this.content.addChild(sprite);
  }
  payout(symbol, x, y) {
    this.symbol(symbol, x, y);
    this.text(SYMBOL_NAMES[symbol] ?? "", x, y + 84, small, 0.5);
    const values = PAYTABLE_AT_2[symbol] ?? {};
    [5, 4, 3].forEach((count) => {
      const value = values[count];
      if (value !== void 0 || symbol === SymbolId.Jack || symbol === SymbolId.Ten) {
        this.text(`${count}: ${value === void 0 ? "\u2014" : money(value * this.bet / 2)}`, x, y + 130 + (5 - count) * 33, white, 0.5);
      }
    });
  }
  line(y) {
    this.content.addChild(new Graphics().moveTo(235, y).lineTo(485, y).stroke({ color: 7830425, width: 1 }));
  }
  buildContent() {
    this.text("Pay Table", 360, 24, title, 0.5);
    this.text("Payouts", 360, 102, title, 0.5);
    this.payout(SymbolId.Pig1, 135, 240);
    this.payout(SymbolId.Pig2, 360, 240);
    this.payout(SymbolId.Pig3, 585, 240);
    this.payout(SymbolId.Toolbox, 135, 530);
    this.payout(SymbolId.Tape, 360, 530);
    this.payout(SymbolId.JackHammer, 585, 530);
    this.payout(SymbolId.Ace, 135, 820);
    this.payout(SymbolId.King, 360, 820);
    this.payout(SymbolId.Queen, 585, 820);
    this.payout(SymbolId.Jack, 250, 1100);
    this.payout(SymbolId.Ten, 470, 1100);
    this.line(1320);
    this.text("Winning pays per symbol.", 50, 1350, white);
    const ways = new Text({
      text: "Only highest winner paid per winning combination.\nAll Reel Ways\u2122 must occur on adjacent reels,\nbeginning with the leftmost reel. Paytable is\ndynamic and reflects actual bet configuration.",
      style: new TextStyle({ fontFamily: "Arial", fontSize: 27, fill: 16777215, lineHeight: 37 })
    });
    ways.position.set(50, 1400);
    this.content.addChild(ways);
    this.line(1585);
    this.text("SCATTERS", 360, 1610, title, 0.5);
    const scatterIds = [SymbolId.Scatter, SymbolId.ScatterA, SymbolId.ScatterB, SymbolId.ScatterC, SymbolId.ScatterD];
    const labels = ["HARD HAT", "H SAW", "V SAW", "HAZARD", "SUPER SAW"];
    scatterIds.forEach((symbol, i) => {
      const x = 76 + i * 142;
      this.symbol(symbol, x, 1728, 90, 80);
      this.text(labels[i], x, 1780, new TextStyle({ fontFamily: "Arial", fontSize: 16, fill: 16777215 }), 0.5);
    });
    this.content.addChild(new Graphics().rect(45, 1665, 630, 160).stroke({ color: 10856379, width: 1 }));
    this.line(1860);
    this.text("WILD", 360, 1885, title, 0.5);
    this.symbol(SymbolId.Wolf, 360, 2010, 145, 125);
    this.text("WILD symbol appears only on reels 2\u20135.", 50, 2100, white);
    const wildRules = new Text({
      text: "WILD substitutes for all symbols except HARD HAT,\nHORIZONTAL SAW, VERTICAL SAW, HAZARD and\nSUPER SAW HARD HAT symbols.",
      style: new TextStyle({ fontFamily: "Arial", fontSize: 25, fill: 16777215, lineHeight: 35 })
    });
    wildRules.position.set(50, 2150);
    this.content.addChild(wildRules);
    this.line(2290);
    this.text("FREE SPINS FEATURE", 360, 2320, title, 0.5);
    const ruleStyle = new TextStyle({ fontFamily: "Arial", fontSize: 23, fill: 16777215, lineHeight: 34, wordWrap: true, wordWrapWidth: 620 });
    const freeSpinRules = new Text({
      text: "Any combination of 6+ SCATTER symbols without a SUPER SAW\nHARD HAT triggers 6 free spins. Before the feature begins,\nSTRAW FRAME is added to each triggering SCATTER position.\nEvery HORIZONTAL/VERTICAL SAW HARD HAT generates a saw\nbefore the feature and during each spin. Saw-touched positions\nare evaluated as HARD HAT landings, excluding the initial position.\n3+ SCATTERS award 1 additional spin. WILD appears on reels 2\u20133.",
      style: ruleStyle
    });
    freeSpinRules.position.set(50, 2380);
    this.content.addChild(freeSpinRules);
    const superDividerY = freeSpinRules.y + freeSpinRules.height + 45;
    this.line(superDividerY);
    this.text("SUPER SAW FREE SPINS", 360, superDividerY + 30, title, 0.5);
    const superSawRules = new Text({
      text: "Any combination of 6+ SCATTER symbols with a SUPER SAW HARD\nHAT triggers 6 Super Saw Free Spins. Before the feature begins,\neach HARD HAT, HAZARD HARD HAT and SUPER SAW HARD HAT is\nreplaced with a HORIZONTAL and/or VERTICAL SAW HARD HAT.\nSTRAW FRAME is added to each triggering SCATTER position.\nEvery SAW HARD HAT generates a saw before the feature and\nduring each spin. 3+ SAW and/or HAZARD HARD HATS award 1\nadditional spin. WILD appears on reels 2\u20134.",
      style: ruleStyle
    });
    superSawRules.position.set(50, superDividerY + 90);
    this.content.addChild(superSawRules);
    const frameRules = new Text({
      text: "Frames upgrade Straw \u2192 Stick \u2192 Brick and remain held; houses reveal awards at the end.",
      style: new TextStyle({ fontFamily: "Arial", fontSize: 23, fill: 16777215, lineHeight: 34, align: "center", wordWrap: true, wordWrapWidth: 620 })
    });
    frameRules.anchor.set(0.5, 0);
    frameRules.position.set(360, superSawRules.y + superSawRules.height + 45);
    this.content.addChild(frameRules);
    this.contentHeight = frameRules.y + frameRules.height + 60;
  }
  rebuildDynamicText() {
    const old = this.content.removeChildren();
    old.forEach((child) => child.destroy());
    this.buildContent();
    this.balanceText.text = `Balance
${money(this.balance)}`;
    this.betText.text = `Bet
${money(this.bet)}`;
  }
  open(balance, bet) {
    this.balance = balance;
    this.bet = bet;
    this.rebuildDynamicText();
    this.scrollY = 0;
    this.root.visible = true;
    this.layout(this.width, this.height);
    this.applyScroll();
  }
  closeOverlay() {
    this.root.visible = false;
    this.dragging = false;
  }
  layout(width, height) {
    this.width = width;
    this.height = height;
    const portrait = height > width;
    this.headerH = Math.max(64, Math.min(100, height * 0.075));
    this.footerH = Math.max(58, Math.min(86, height * 0.07));
    this.scale = portrait ? width / 720 : Math.min(1, width / 900);
    this.shade.clear().rect(0, 0, width, height).fill(197400);
    this.header.clear().rect(0, 0, width, this.headerH).fill(464478);
    this.footer.clear().rect(0, height - this.footerH, width, this.footerH).fill(464478);
    this.logo.position.set(width / 2, this.headerH / 2);
    const logoScale = Math.min(width * 0.36 / this.logo.texture.width, this.headerH * 0.92 / this.logo.texture.height);
    this.logo.scale.set(logoScale);
    const closeSize = Math.min(52, this.headerH * 0.55);
    this.back.width = closeSize;
    this.back.scale.y = this.back.scale.x;
    this.close.width = closeSize;
    this.close.scale.y = this.close.scale.x;
    this.back.position.set(40, this.headerH / 2);
    this.close.position.set(width - 40, this.headerH / 2);
    const contentW = 720 * this.scale;
    this.viewport.position.set((width - contentW) / 2, this.headerH);
    this.content.scale.set(this.scale);
    this.mask.clear().rect((width - contentW) / 2, this.headerH, contentW, height - this.headerH - this.footerH).fill(16777215);
    this.balanceText.style = new TextStyle({ fontFamily: "Arial", fontSize: Math.max(14, this.footerH * 0.25), fill: 16777215, align: "center" });
    this.betText.style = this.balanceText.style;
    this.balanceText.anchor.set(0.5);
    this.winText.anchor.set(0.5);
    this.betText.anchor.set(0.5);
    this.balanceText.position.set(width * 0.18, height - this.footerH * 0.5);
    this.winText.style = this.balanceText.style;
    this.winText.position.set(width * 0.5, height - this.footerH * 0.5);
    this.betText.position.set(width * 0.82, height - this.footerH * 0.5);
    this.applyScroll();
  }
  applyScroll() {
    const viewportH = this.height - this.headerH - this.footerH;
    const max = Math.max(0, this.contentHeight * this.scale - viewportH);
    this.scrollY = Math.max(0, Math.min(max / this.scale, this.scrollY));
    // scrollY is stored in content coordinates; the container's own scale does
    // not scale its position, so convert the offset to viewport pixels here.
    this.content.y = -this.scrollY * this.scale;
    const trackX = this.width - 12;
    this.scrollTrack.clear().rect(trackX, this.headerH + 20, 5, viewportH - 40).fill({ color: 16777215, alpha: 0.15 });
    const thumbH = Math.max(40, viewportH * Math.min(1, viewportH / (this.contentHeight * this.scale)));
    const travel = viewportH - 40 - thumbH;
    const ratio = max ? this.scrollY * this.scale / max : 0;
    this.scrollThumb.clear().roundRect(trackX, this.headerH + 20 + travel * ratio, 5, thumbH, 3).fill(16777215);
  }
}
export {
  Paytable
};
