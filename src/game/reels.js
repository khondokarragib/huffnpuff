var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { AnimatedSprite, Container, Graphics, Sprite, Texture } from "../../vendor.js";
import { REELS, ROWS } from "./config.js";
import { Rng } from "./rng.js";
import { fitSpine } from "./spine.js";
import { SymbolId } from "./types.js";
function symbolAnimationName(symbol) {
  switch (symbol) {
    case SymbolId.Wolf:
      return "wolf_sym";
    case SymbolId.Pig1:
      return "brick";
    case SymbolId.Pig2:
      return "pig_b";
    case SymbolId.Pig3:
      return "pig_c";
    case SymbolId.Toolbox:
      return "toolbox_a";
    case SymbolId.Tape:
      return "tape";
    case SymbolId.JackHammer:
      return "Jackhammer";
    case SymbolId.Ace:
      return "sym_a";
    case SymbolId.King:
      return "sym_k";
    case SymbolId.Queen:
      return "sym_q";
    case SymbolId.Jack:
      return "sym_j";
    case SymbolId.Ten:
      return "sym_ten";
    case SymbolId.Mystery:
    case SymbolId.MysteryHardHat:
      return "mystery_sym";
    default:
      return null;
  }
}
function symbolTexture(atlases, symbol) {
  const name = symbolAnimationName(symbol);
  if (name) return atlases.symbols.texture(name);
  switch (symbol) {
    case SymbolId.ScatterA:
      return atlases.hats.texture("hat_horizontal_static");
    case SymbolId.ScatterB:
      return atlases.hats.texture("hat_vertical_static");
    case SymbolId.ScatterC:
      return atlases.hats.texture("white_saw_static");
    case SymbolId.ScatterD:
      return atlases.hats.texture("green_supersaw_static");
    case SymbolId.Scatter:
    default:
      return atlases.hats.texture("yellow_hat_static");
  }
}
function symbolSpine(symbol) {
  switch (symbol) {
    case SymbolId.Mystery:
    case SymbolId.MysteryHardHat:
      return "mystery_ideal";
    case SymbolId.ScatterA:
      return "yellow_hat_horizontal_ideal";
    case SymbolId.ScatterB:
      return "yellow_hat_vertical_ideal";
    case SymbolId.ScatterC:
      return "white_hat_ideal";
    case SymbolId.ScatterD:
      return "green_hat_ideal";
    case SymbolId.Scatter:
      return "yellow_hat_ideal";
    default:
      return null;
  }
}
const REFERENCE_CELL = 166;
const SPIN_UP_DURATION = 0.06;
const SPIN_UP_SPEED = 3500;
// Regular spins use a slower presentation speed; turbo remains a separate path.
const LINEAR_SPIN_SPEED = 5000;
// The supplied reel controller uses a 600-unit regular stop distance.
const STOP_DISTANCE = 600;
// Virtual strip length: visible window (6) + approach tape (up to 9 cells).
const STRIP_LENGTH = 18;
const REBOUND_DURATION = 0.5;
const REBOUND_DIP = 0.5;
// Ways-pay presentation dim for non-winning symbols. See highlight().
const DIM_ALPHA = 0.4;
// Decelerate directly onto the supplied outcome. Overshooting the target can
// expose symbols beyond it and make the settled grid appear to change.
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutElastic = (t) => t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
class ReelColumn {
  constructor(reel, atlases, spines, randomTexture) {
    __publicField(this, "reel", reel);
    __publicField(this, "atlases", atlases);
    __publicField(this, "spines", spines);
    __publicField(this, "container", new Container());
    __publicField(this, "sprites", []);
    __publicField(this, "ids", []);
    __publicField(this, "nativeSymbols", []);
    __publicField(this, "nativeLayoutKeys", []);
    __publicField(this, "spinning", false);
    __publicField(this, "stopping", false);
    __publicField(this, "stopped", false);
    __publicField(this, "offset", 0);
    __publicField(this, "spinUpElapsed", 0);
    __publicField(this, "speed", 0);
    __publicField(this, "stopElapsed", 0);
    __publicField(this, "stopDuration", 0.6);
    __publicField(this, "stopStartOffset", 0);
    __publicField(this, "stopTravel", 0);
    __publicField(this, "cellW", 100);
    __publicField(this, "cellH", 100);
    __publicField(this, "baseY", 0);
    __publicField(this, "lastStopOffset", 0);
    __publicField(this, "landingGrid", null);
    // Fired once from update() at the exact frame the stop tween lands.
    __publicField(this, "onStopped", null);
    // Ways-pay presentation: rows in this strip window that belong to a
    // winning combination, and the dim level applied to all other visible
    // symbols. Mirrors the original DimmableSymbol behaviour: non-winning
    // symbols are dimmed, winners stay at full alpha and play their atlas
    // win-celebration animation.
    __publicField(this, "winnerRows", /* @__PURE__ */ new Set());
    __publicField(this, "dimLevel", null);
    __publicField(this, "winAnims", []);
    __publicField(this, "winAnimNames", []);
    __publicField(this, "randomTexture");
    this.randomTexture = randomTexture;
    for (let i = 0; i < STRIP_LENGTH; i++) {
      const id = randomTexture();
      this.ids.push(id);
      const sprite = new Sprite(symbolTexture(atlases, id));
      sprite.anchor.set(0.5);
      const native = spines.create("symbols");
      native.visible = false;
      this.sprites.push(sprite);
      this.nativeSymbols.push(native);
      this.nativeLayoutKeys.push("");
      this.container.addChild(sprite, native);
    }
  }
  layout(x, cellW, cellH) {
    // A live orientation change must preserve the reel's animation phase in
    // cell units. Keeping old pixel offsets would change the number of strip
    // rotations and could land on symbols other than the selected outcome.
    const ratio = this.cellH > 0 ? cellH / this.cellH : 1;
    if (ratio !== 1) {
      this.offset *= ratio;
      this.speed *= ratio;
      this.stopStartOffset *= ratio;
      this.stopTravel *= ratio;
      this.lastStopOffset *= ratio;
    }
    this.container.x = x;
    this.cellW = cellW;
    this.cellH = cellH;
    this.renderSymbols();
  }
  start() {
    this.spinning = true;
    this.stopping = false;
    this.stopped = false;
    this.spinUpElapsed = 0;
    this.speed = 0;
    this.onStopped = null;
    this.container.y = this.baseY;
  }
  applyGrid(grid) {
    for (let row = 0; row < ROWS; row++) this.ids[row + 1] = grid[this.reel][row];
    this.ids[0] = grid[this.reel][ROWS - 1];
    this.ids[ROWS + 1] = grid[this.reel][0];
  }
  stop(grid, quick = false) {
    this.spinning = false;
    this.stopping = true;
    this.stopped = false;
    this.stopElapsed = 0;
    this.stopDuration = quick ? 0.1 : 0.8;
    this.stopStartOffset = this.offset;
    this.landingGrid = grid;
    const scale = this.cellH / REFERENCE_CELL;
    const originalDistance = STOP_DISTANCE * scale;
    const targetOffset = Math.ceil((this.stopStartOffset + originalDistance) / this.cellH) * this.cellH;
    this.stopTravel = targetOffset - this.stopStartOffset;
    // Seed the final symbols into the strip cells that are not visible yet,
    // positioned so they scroll into the window one by one during the stop
    // and land exactly on the outcome. The visible window is left untouched
    // — no symbol ever pops or snaps at the rest position.
    // Exact whole-cell count the stop tween will travel (targetOffset is a
    // cellH multiple by construction); the seeded rows must match the number
    // of strip rotations during deceleration exactly.
    const steps = Math.max(1, Math.round(targetOffset / this.cellH));
    const wrap = this.ids.length;
    const sourceIndex = (i) => ((i - steps) % wrap + wrap) % wrap;
    for (let row = 0; row < ROWS; row++) this.ids[sourceIndex(row + 1)] = grid[this.reel][row];
    this.ids[sourceIndex(0)] = grid[this.reel][ROWS - 1];
    this.lastStopOffset = this.stopStartOffset;
    this.container.y = this.baseY;
  }
  setIdle(grid) {
    this.spinning = false;
    this.stopping = false;
    this.stopped = true;
    this.offset = 0;
    this.container.y = this.baseY;
    this.applyGrid(grid);
    this.renderSymbols();
  }
  landingSpringY(t) {
    // The spring is part of the stop, not a separate post-land animation.
    // Move the whole settled column down by half a cell, then elastically
    // return it to base before the landing callback fires. Keeping this
    // offset on the container preserves the strip's engine-selected symbols.
    const duration = Math.min(REBOUND_DURATION, this.stopDuration * 0.65);
    const start = 1 - duration / this.stopDuration;
    if (t <= start) return this.baseY;
    const phase = (t - start) / (1 - start);
    const dip = this.cellH * REBOUND_DIP;
    if (phase < 0.22) {
      const u = phase / 0.22;
      return this.baseY + dip * u * (2 - u);
    }
    const u = (phase - 0.22) / 0.78;
    return this.baseY + dip * (1 - easeOutElastic(u));
  }
  update(dt) {
    if (this.spinning) {
      this.spinUpElapsed += dt;
      const unit = this.cellH / REFERENCE_CELL;
      const startT = Math.min(1, this.spinUpElapsed / SPIN_UP_DURATION);
      const targetSpeed = startT < 1 ? SPIN_UP_SPEED * startT : LINEAR_SPIN_SPEED;
      this.speed = targetSpeed * unit;
      this.offset += dt * this.speed;
      while (this.offset >= this.cellH) {
        this.offset -= this.cellH;
        const last = this.ids.pop();
        this.ids.unshift(this.randomTexture());
        this.ids[0] = last;
      }
      this.renderSymbols();
    } else if (this.stopping) {
      const previousOffset = this.lastStopOffset;
      this.stopElapsed += dt;
      const t = Math.min(1, this.stopElapsed / this.stopDuration);
      const position = this.stopStartOffset + this.stopTravel * easeOutCubic(t);
      // Rotate and normalize at every crossed cell, exactly as during linear
      // motion. Keeping the accumulated offset until the final frame would
      // make the last rotation reveal different symbols when it resets to 0.
      let crossed = Math.floor(position / this.cellH) - Math.floor(previousOffset / this.cellH);
      while (crossed > 0) {
        this.ids.unshift(this.ids.pop());
        crossed--;
      }
      while (crossed < 0) {
        this.ids.push(this.ids.shift());
        crossed++;
      }
      this.offset = ((position % this.cellH) + this.cellH) % this.cellH;
      this.lastStopOffset = position;
      this.container.y = this.landingSpringY(t);
      if (t >= 1) {
        this.offset = 0;
        this.lastStopOffset = 0;
        this.container.y = this.baseY;
        this.stopping = false;
        this.stopped = true;
        if (this.landingGrid) this.applyGrid(this.landingGrid);
        if (this.onStopped) {
          const landed = this.onStopped;
          this.onStopped = null;
          landed();
        }
      }
      this.renderSymbols();
    }
  }
  renderSymbols() {
    const trackHeight = this.sprites.length * this.cellH;
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      const texture = symbolTexture(this.atlases, this.ids[i]);
      if (sprite.texture !== texture) sprite.texture = texture;
      sprite.x = this.cellW / 2;
      const rawY = (i - 0.5) * this.cellH + this.offset;
      sprite.y = ((rawY + this.cellH * 0.5) % trackHeight + trackHeight) % trackHeight - this.cellH * 0.5;
      const frameW = texture.frame ? texture.frame.width : texture.width;
      const frameH = texture.frame ? texture.frame.height : texture.height;
      const scale = Math.min(this.cellW / frameW, this.cellH / frameH);
      sprite.scale.set(scale);
      if (texture.trim && texture.orig) {
        sprite.x -= (texture.trim.x + texture.trim.width / 2 - texture.orig.width / 2) * scale;
        sprite.y -= (texture.trim.y + texture.trim.height / 2 - texture.orig.height / 2) * scale;
      }
      // Ways-pay presentation (only once the reel has settled): winning
      // symbols stay bright and play their atlas win-celebration animation;
      // every other visible symbol is dimmed, mirroring the original
      // DimmableSymbol dim (non-winners alpha-reduced, winners alpha 1).
      const present = this.dimLevel !== null && this.stopped;
      const row = i - 1;
      const isWinner = present && row >= 0 && row < ROWS && this.winnerRows.has(row);
      const dimmed = present && !isWinner;
      sprite.alpha = this.spinning ? 0.62 : dimmed ? this.dimLevel : 1;
      if (this.spinning) sprite.scale.y *= 1.16;
      const animName = symbolAnimationName(this.ids[i]);
      const useWinAnim = isWinner && animName !== null && symbolSpine(this.ids[i]) === null && this.atlases.symbols.animation(animName).length > 1;
      let winAnim = this.winAnims[i];
      if (useWinAnim) {
        if (!winAnim) {
          winAnim = new AnimatedSprite(this.atlases.symbols.animation(animName));
          winAnim.anchor.set(0.5);
          winAnim.loop = true;
          winAnim.animationSpeed = this.atlases.symbols.fps / 60;
          this.container.addChild(winAnim);
          this.winAnims[i] = winAnim;
          this.winAnimNames[i] = animName;
        } else if (this.winAnimNames[i] !== animName) {
          winAnim.textures = this.atlases.symbols.animation(animName);
          this.winAnimNames[i] = animName;
        }
        winAnim.position.set(sprite.x, sprite.y);
        winAnim.scale.set(sprite.scale.x, sprite.scale.y);
        winAnim.visible = true;
        if (!winAnim.playing) winAnim.play();
      } else if (winAnim) {
        winAnim.visible = false;
        if (winAnim.playing) winAnim.stop();
      }
      const native = this.nativeSymbols[i];
      const animation = symbolSpine(this.ids[i]);
      native.position.set(sprite.x, sprite.y);
      native.alpha = dimmed ? this.dimLevel : 1;
      native.visible = !useWinAnim && animation !== null;
      sprite.visible = !useWinAnim && animation === null;
      if (animation) {
        const layoutKey = `${animation}:${this.cellW.toFixed(2)}:${this.cellH.toFixed(2)}`;
        if (this.nativeLayoutKeys[i] !== layoutKey) {
          this.spines.play(native, animation);
          fitSpine(native, this.cellW, this.cellH);
          this.nativeLayoutKeys[i] = layoutKey;
        }
      } else this.nativeLayoutKeys[i] = "";
      if (this.hiddenCells?.has(`${this.reel}:${i - 1}`)) {
        sprite.visible = false;
        native.visible = false;
        if (winAnim) winAnim.visible = false;
      }
    }
  }
}
class ReelSet {
  constructor(atlases, initialGrid, spines) {
    __publicField(this, "atlases", atlases);
    __publicField(this, "spines", spines);
    __publicField(this, "root", new Container());
    __publicField(this, "window", new Container());
    __publicField(this, "frameLayer", new Container());
    __publicField(this, "structureLayer", new Container());
    __publicField(this, "verticalPipes", []);
    __publicField(this, "lockJoints", []);
    __publicField(this, "lockLayer", new Container());
    __publicField(this, "houseLayer", new Container());
    __publicField(this, "background");
    __publicField(this, "mask", new Graphics());
    __publicField(this, "columns", []);
    __publicField(this, "frames", []);
    __publicField(this, "locks", []);
    __publicField(this, "winGlow", new Graphics());
    __publicField(this, "grid");
    __publicField(this, "x", 0);
    __publicField(this, "y", 0);
    __publicField(this, "width", 500);
    __publicField(this, "height", 600);
    __publicField(this, "activeRows", 3);
    __publicField(this, "winners", []);
    __publicField(this, "time", 0);
    __publicField(this, "visualRng", new Rng(1213091912));
    __publicField(this, "hiddenCells", /* @__PURE__ */ new Set());
    this.grid = initialGrid;
    this.background = new Sprite(atlases.base.texture("reel_basgame"));
    this.root.addChild(this.background);
    this.root.addChild(this.window);
    this.window.mask = this.mask;
    this.root.addChild(this.mask);
    for (let reel = 0; reel < REELS; reel++) {
      const column = new ReelColumn(reel, atlases, spines, () => this.randomIdleSymbol(reel));
      column.hiddenCells = this.hiddenCells;
      this.columns.push(column);
      this.window.addChild(column.container);
    }
    // Original surrounding scaffold: two full-height side rods, with the
    // cross joints attached to their corresponding removable lock rows.
    for (let side = 0; side < 2; side++) {
      const pipe = new Sprite(atlases.base.texture("scaffoldings_pipe"));
      pipe.label = side ? "rightVerticalRod" : "leftVerticalRod";
      pipe.anchor.set(0.5);
      pipe.rotation = Math.PI / 2;
      this.verticalPipes.push(pipe);
      this.structureLayer.addChild(pipe);
    }
    this.root.addChild(this.structureLayer, this.frameLayer, this.lockLayer, this.winGlow, this.houseLayer);
    for (let reel = 0; reel < REELS; reel++) {
      this.frames[reel] = [];
      for (let row = 0; row < ROWS; row++) {
        const frame = new Sprite(Texture.EMPTY);
        frame.anchor.set(0.5);
        frame.visible = false;
        this.frames[reel][row] = frame;
        this.frameLayer.addChild(frame);
      }
    }
    for (let row = 0; row < ROWS; row++) {
      const lock = new Container();
      const shade = new Graphics().rect(0, 0, 1, 1).fill({ color: 201231, alpha: 0.34 });
      const floor = new Sprite(atlases.base.texture("scaffoldings_floor"));
      floor.anchor.set(0.5);
      const joints = [0, 1].map((side) => {
        const joint = new Sprite(atlases.base.texture("pipe_joined_pluse"));
        joint.label = `crossJoint_row${row * 2 + side}`;
        joint.anchor.set(0.5);
        joint.rotation = side ? Math.PI : 0;
        lock.addChild(joint);
        return joint;
      });
      this.lockJoints[row] = joints;
      lock.addChild(shade, floor);
      // Keep the darkening and beam below the side joints while retaining
      // their existing child indices used by layout().
      lock.setChildIndex(shade, 0);
      lock.setChildIndex(floor, 1);
      lock.visible = false;
      this.locks[row] = lock;
      this.lockLayer.addChild(lock);
    }
    this.setGrid(initialGrid, 3);
  }
  randomIdleSymbol(reel) {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    if (reel > 0 && this.visualRng.chance(0.08)) return SymbolId.Wolf;
    return this.visualRng.pick(ids);
  }
  layout(x, y, width, height, activeRows, freeSpin, screenPortrait = this.screenPortrait ?? height > width) {
    this.screenPortrait = screenPortrait;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.activeRows = activeRows;
    this.root.position.set(x, y);
    this.background.texture = freeSpin ? this.atlases.freespin.texture("reel_freegame") : this.atlases.base.texture("reel_basgame");
    this.background.position.set(0, 0);
    this.background.width = width;
    this.background.height = height;
    // Original reel_basgame artwork: 523×603 frame, with a 497×494
    // symbol window beginning at (13,30). Keep symbols out of the beam,
    // scaffold edges, and brick footer drawn in the texture.
    const innerX = width * 13 / 523;
    const innerY = height * 30 / 603;
    const innerW = width * 497 / 523;
    const innerH = height * 494 / 603;
    this.mask.clear().rect(innerX, innerY, innerW, innerH).fill(16777215);
    const cellW = innerW / REELS;
    const cellH = innerH / ROWS;
    this.columns.forEach((column, reel) => {
      column.layout(innerX + reel * cellW, cellW, cellH);
      column.container.y = innerY;
      column.baseY = innerY;
    });
    const unit = width / 523;
    const portrait = screenPortrait;
    this.verticalPipes.forEach((pipe, side) => {
      pipe.scale.set(unit);
      pipe.position.set(width / 2 + (side ? 255.5 : -255.5) * unit, height / 2 + (portrait ? 40 : 27) * unit);
    });
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = 0; row < ROWS; row++) {
        const frame = this.frames[reel][row];
        frame.position.set(innerX + (reel + 0.5) * cellW, innerY + (row + 0.5) * cellH);
        frame.width = cellW;
        frame.height = cellH;
      }
    }
    for (let row = 0; row < ROWS; row++) {
      const lock = this.locks[row];
      lock.position.set(innerX, innerY + row * cellH);
      lock.visible = row < ROWS - activeRows;
      const shade = lock.children[0];
      shade.clear().rect(0, 0, innerW, cellH).fill({ color: 134418, alpha: 0.34 });
      shade.scale.set(1);
      const floor = lock.children[1];
      floor.width = innerW * 1.04;
      floor.scale.y = floor.scale.x;
      floor.position.set(innerW / 2, cellH * 0.82);
      const jointRow = Math.min(row, 2);
      const jointY = [[-166, -169.5], [-86, -88.5], [-3.5, -6]][jointRow];
      this.lockJoints[row].forEach((joint, side) => {
        joint.scale.set(unit);
        joint.position.set(
          width / 2 + (side ? 255 : -253.5) * unit - lock.x,
          height / 2 + jointY[side] * unit - lock.y
        );
      });
    }
    for (const house of this.houseLayer.children) {
      if (house.__cell) this.layoutHouse(house);
    }
    this.drawWinners();
  }
  start() {
    this.clearWinners();
    this.clearHouses();
    this.frameLayer.visible = false;
    this.columns.forEach((column) => column.start());
  }
  stopColumn(reel, grid, quick = false, onStopped = null) {
    this.columns[reel].stop(grid, quick);
    this.columns[reel].onStopped = onStopped;
  }
  get stoppedCount() {
    return this.columns.filter((column) => column.stopped).length;
  }
  setGrid(grid, activeRows) {
    this.grid = grid;
    this.activeRows = activeRows;
    this.columns.forEach((column) => column.setIdle(grid));
    this.layout(this.x, this.y, this.width, this.height, activeRows, this.background.texture === this.atlases.freespin.texture("reel_freegame"));
  }
  showFrames(frames, animatedPositions = []) {
    const animated = new Set(animatedPositions.map((position) => `${position.reel}:${position.row}`));
    this.frameLayer.visible = true;
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = 0; row < ROWS; row++) {
        const sprite = this.frames[reel][row];
        const level = frames[reel][row];
        // A cell has one persistent frame representation only. Construction
        // frames are the live Spine objects; static sprites cover supplied
        // frame state that does not have a live construction object.
        sprite.visible = level > 0 && row >= ROWS - this.activeRows && !animated.has(`${reel}:${row}`);
        if (level === 1) sprite.texture = this.atlases.paytable.texture("frame_straw");
        if (level === 2) sprite.texture = this.atlases.paytable.texture("frame_stick");
        if (level === 3) sprite.texture = this.atlases.paytable.texture("frame_brick");
      }
    }
  }
  showHouse(position, level) {
    const name = level === 1 ? "house_straw" : level === 2 ? "house_stick" : "house_brick";
    const house = new Sprite(this.atlases.paytable.texture(name));
    house.anchor.set(0.5, 1);
    house.__cell = { reel: position.reel, row: position.row };
    this.layoutHouse(house);
    this.houseLayer.addChild(house);
    return house;
  }
  layoutHouse(house) {
    const cellW = this.width * 497 / 523 / REELS;
    const cellH = this.height * 494 / 603 / ROWS;
    house.position.set(this.width * 13 / 523 + (house.__cell.reel + 0.5) * cellW, this.height * 30 / 603 + (house.__cell.row + 0.94) * cellH);
    const scale = Math.min(cellW * 0.98 / house.texture.width, cellH * 1.25 / house.texture.height);
    house.scale.set(scale);
  }
  setSymbol(position, symbol) {
    if (!this.grid[position.reel]) return;
    this.grid[position.reel][position.row] = symbol;
    const column = this.columns[position.reel];
    const index = position.row + 1;
    column.ids[index] = symbol;
    if (position.row === 0) column.ids[ROWS + 1] = symbol;
    if (position.row === ROWS - 1) column.ids[0] = symbol;
    column.nativeLayoutKeys[index] = "";
    column.renderSymbols();
  }
  setCellVisible(position, visible) {
    const key = `${position.reel}:${position.row}`;
    if (visible) this.hiddenCells.delete(key);
    else this.hiddenCells.add(key);
    const column = this.columns[position.reel];
    const index = position.row + 1;
    column.sprites[index].visible = visible && symbolSpine(column.ids[index]) === null;
    column.nativeSymbols[index].visible = visible && symbolSpine(column.ids[index]) !== null;
  }
  clearHouses() {
    this.houseLayer.removeChildren().forEach((child) => child.destroy());
    this.hiddenCells.clear();
    this.columns.forEach((column) => column.renderSymbols());
  }
  highlight(wins) {
    this.winners = wins.flatMap((win) => win.positions);
    // The exact dim descriptor is not present in the supplied bundle (the
    // original injects it at runtime). The value below is measured from the
    // supplied screencast win presentations: active-row non-winning symbols
    // sit at roughly 0.35-0.5 of full brightness; locked rows stack their
    // existing dark shade on top, which matches the near-black look there.
    const winnerRows = Array.from({ length: REELS }, () => /* @__PURE__ */ new Set());
    for (const pos of this.winners) winnerRows[pos.reel].add(pos.row);
    this.columns.forEach((column, reel) => {
      column.winnerRows = winnerRows[reel];
      column.dimLevel = DIM_ALPHA;
      column.renderSymbols();
    });
    this.drawWinners();
  }
  clearWinners() {
    this.winners = [];
    this.winGlow.clear();
    this.columns.forEach((column) => {
      column.winnerRows = /* @__PURE__ */ new Set();
      column.dimLevel = null;
      column.renderSymbols();
    });
  }
  drawWinners() {
    this.winGlow.clear();
    const cellW = this.width * 497 / 523 / REELS;
    const cellH = this.height * 494 / 603 / ROWS;
    const innerX = this.width * 13 / 523;
    const innerY = this.height * 30 / 603;
    for (const pos of this.winners) {
      this.winGlow.roundRect(innerX + pos.reel * cellW + 3, innerY + pos.row * cellH + 3, cellW - 6, cellH - 6, 8).stroke({ color: 16768853, width: Math.max(2, cellW * 0.025), alpha: 0.95 });
    }
  }
  positionOf(position) {
    return {
      x: this.x + this.width * 13 / 523 + (position.reel + 0.5) * (this.width * 497 / 523 / REELS),
      y: this.y + this.height * 30 / 603 + (position.row + 0.5) * (this.height * 494 / 603 / ROWS)
    };
  }
  update(dt) {
    this.time += dt;
    this.columns.forEach((column) => column.update(dt));
    if (this.winners.length) this.winGlow.alpha = 0.65 + Math.sin(this.time * 7) * 0.35;
  }
}
export {
  ReelSet,
  symbolTexture
};
