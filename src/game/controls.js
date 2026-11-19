var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Container, Sprite, Text, TextStyle } from "../../vendor.js";
function label(value, size = 24, color = 16777215, align = "center") {
  return new Text({
    text: value,
    style: new TextStyle({
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: size,
      fontWeight: "600",
      fill: color,
      align,
      dropShadow: { color: 0, blur: 3, distance: 2, alpha: 0.7 }
    })
  });
}
class SpriteButton extends Container {
  constructor(normal, action, disabled, pressed) {
    super();
    __publicField(this, "sprite");
    __publicField(this, "action");
    __publicField(this, "enabled", true);
    __publicField(this, "normal");
    __publicField(this, "disabled");
    __publicField(this, "pressed");
    this.normal = normal;
    this.disabled = disabled;
    this.pressed = pressed;
    this.action = action;
    this.sprite = new Sprite(normal);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", () => {
      if (this.enabled) this.action();
    });
    this.on("pointerdown", () => {
      if (this.enabled && this.pressed) this.sprite.texture = this.pressed;
    });
    this.on("pointerup", () => {
      this.sprite.texture = this.normal;
    });
    this.on("pointerupoutside", () => {
      this.sprite.texture = this.normal;
    });
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.alpha = enabled ? 1 : 0.55;
    this.cursor = enabled ? "pointer" : "not-allowed";
    this.sprite.texture = enabled ? this.normal : this.disabled ?? this.normal;
  }
  setTexture(texture) {
    if (this.enabled) this.sprite.texture = texture;
  }
  fit(width, height = width) {
    const scale = Math.min(width / this.sprite.texture.width, height / this.sprite.texture.height);
    this.sprite.scale.set(scale);
    return this;
  }
}
export {
  SpriteButton,
  label
};
