var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { AnimatedSprite, BlurFilter, ColorMatrixFilter, Container, FillGradient, Graphics, Rectangle, Sprite, Text, TextStyle } from "../../vendor.js";
import { AudioSystem } from "./audio.js";
import { ASSET_DEVICE, ensureAtlases } from "./atlas.js";
import {
  BET_LEVELS,
  BUY_PASS_MULTIPLIER,
  DEFAULT_BET,
  FREE_SPINS_AWARDED,
  JACKPOTS,
  REELS,
  ROWS,
  TIMING,
  money
} from "./config.js";
import { SpriteButton, label } from "./controls.js";
import { DEMO_PROBABILITIES } from "./gameMath.js";
import { HangingGirder } from "./hangingGirder.js";
import { Paytable } from "./paytable.js";
import { VirtualCasinoAdapter } from "./platform.js";
import { RowUnlockSequence } from "./rowUnlock.js";
import { SawSequence } from "./sawSequence.js";
import { playSpecialSymbolReveal } from "./specialReveal.js";
import { ReelSet } from "./reels.js";
import { fitSpine } from "./spine.js";
const VALID_SCENARIOS = ["random", "win", "hats", "hazard", "mystery", "feature", "super", "busy"];
const emptyFrames = () => Array.from({ length: REELS }, () => Array(ROWS).fill(0));
const verticalGradient = (stops) => {
  const gradient = new FillGradient({ start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, textureSpace: "local" });
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
};
const JACKPOT_TEXT_COLORS = { GRAND: 0xffc000, MAJOR: 0x6ad3ff, MINOR: 0x37ff41, MINI: 0xe3adfa };
const exactWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exactTween = (duration, update) => new Promise((resolve) => {
  let started = 0;
  const step = (now) => {
    if (!started) started = now;
    const t = Math.min(1, (now - started) / duration);
    update(t);
    if (t < 1) requestAnimationFrame(step);
    else resolve();
  };
  requestAnimationFrame(step);
});
class SlotGame {
  constructor(app, atlases, spines, audio = new AudioSystem()) {
    __publicField(this, "app", app);
    __publicField(this, "atlases", atlases);
    __publicField(this, "spines", spines);
    __publicField(this, "audio", audio);
    __publicField(this, "background", new Container());
    __publicField(this, "legacyBackground", new Container());
    __publicField(this, "sourceStage");
    __publicField(this, "sourceBackground");
    __publicField(this, "sourceSky");
    __publicField(this, "sourceSkyline");
    __publicField(this, "sourceClouds", []);
    __publicField(this, "sourceCloudStates", []);
    __publicField(this, "sourceBirds", []);
    __publicField(this, "sourceBirdStates", []);
    __publicField(this, "sourceBushes", []);
    __publicField(this, "sourceBackgroundElapsed", 0);
    __publicField(this, "gameLayer", new Container());
    __publicField(this, "boardCamera", new Container());
    __publicField(this, "girderCamera", new Container());
    __publicField(this, "boardEffects", new Container());
    __publicField(this, "boardCameraProgress", 0);
    __publicField(this, "boardCameraGeneration", 0);
    __publicField(this, "unlockLayer", new Container());
    // Feature characters sit above the board but below the longitudinal footer.
    __publicField(this, "characterLayer", new Container());
    __publicField(this, "uiLayer", new Container());
    __publicField(this, "effects", new Container());
    __publicField(this, "modal", new Container());
    __publicField(this, "titleScreen", new Container());
    __publicField(this, "reels");
    __publicField(this, "paytable");
    __publicField(this, "sky");
    __publicField(this, "skyline");
    __publicField(this, "grass");
    __publicField(this, "logo");
    __publicField(this, "backgroundAnim");
    __publicField(this, "pig1");
    __publicField(this, "pig2");
    __publicField(this, "pig3");
    __publicField(this, "hangingHats");
    __publicField(this, "birds", []);
    __publicField(this, "birdStates", []);
    __publicField(this, "clouds", []);
    __publicField(this, "cloudSpeeds", [5, 8, 11]);
    __publicField(this, "bottomBar", new Graphics());
    __publicField(this, "balanceText", label("", 25));
    __publicField(this, "betText", label("", 25));
    __publicField(this, "winText", label("", 25));
    __publicField(this, "waysText", label("243 WAYS", 24, 16773023));
    __publicField(this, "featureText", label("", 25, 16777215));
    __publicField(this, "featureTotalText", label("", 22, 16773023));
    __publicField(this, "featureTotalCaption", label("TOTAL WIN", 18, 14827776));
    __publicField(this, "featureMeter", new Container());
    __publicField(this, "featureTally", new Container());
    __publicField(this, "winResultText", label("", 42, 16777215));
    __publicField(this, "tipRoot", new Container());
    __publicField(this, "tipHazard", new Container());
    __publicField(this, "tipUpgrade", new Container());
    __publicField(this, "banner", new Container());
    __publicField(this, "bannerBg", new Graphics());
    __publicField(this, "bannerText", label("", 42, 16773800));
    __publicField(this, "spinButton");
    __publicField(this, "autoSpinDisplay");
    __publicField(this, "autoButton");
    __publicField(this, "turboButton");
    __publicField(this, "menuButton");
    __publicField(this, "plusButton");
    __publicField(this, "minusButton");
    __publicField(this, "buyButton");
    __publicField(this, "spinBackdrop");
    __publicField(this, "autoBackdrop");
    __publicField(this, "betBackdrop");
    __publicField(this, "betIcon");
    __publicField(this, "waysTextRight", label("243 WAYS", 20, 16773023));
    __publicField(this, "waysPanels", []);
    __publicField(this, "constructionPipes");
    __publicField(this, "constructionBeam");
    __publicField(this, "soundButton", label("SOUND ON", 16, 16777215));
    __publicField(this, "footerGame", label("HUFF N' PUFF HIGHRISE™", 10, 16777215));
    __publicField(this, "footerTime", label("", 10, 16777215));
    __publicField(this, "jackpots", []);
    __publicField(this, "houseAnimations", /* @__PURE__ */ new Map());
    __publicField(this, "featureObjects", []);
    __publicField(this, "symbolOverlays", []);
    __publicField(this, "frameAnimations", []);
    __publicField(this, "firstJackpotBlast", false);
    __publicField(this, "platform", new VirtualCasinoAdapter());
    __publicField(this, "state", "idle");
    __publicField(this, "mode", "base");
    __publicField(this, "grid");
    __publicField(this, "frames", emptyFrames());
    __publicField(this, "activeRows", 3);
    __publicField(this, "bet", DEFAULT_BET);
    __publicField(this, "win", 0);
    __publicField(this, "featureWin", 0);
    __publicField(this, "freeSpins", 0);
    __publicField(this, "freeSpinIndex", 0);
    __publicField(this, "autoplayRemaining", 0);
    __publicField(this, "turbo", false);
    __publicField(this, "quickStop", false);
    __publicField(this, "paused", false);
    __publicField(this, "disposed", false);
    __publicField(this, "spinCounter", 0);
    __publicField(this, "scenario", "random");
    __publicField(this, "prepaidScenario", null);
    __publicField(this, "baseSeed");
    __publicField(this, "lastResult", null);
    __publicField(this, "lastResultSuppressedFrames", false);
    __publicField(this, "board", { x: 0, y: 0, width: 500, height: 600 });
    __publicField(this, "elapsed", 0);
    __publicField(this, "layout", () => {
      const w = this.app.screen.width;
      const h = this.app.screen.height;
      const portrait = this.isPortraitLayout();
      const footerH = this.footerHeight();
      this.sky.width = w;
      this.sky.height = h;
      this.skyline.width = Math.max(w * 1.15, 700);
      this.skyline.scale.y = this.skyline.scale.x;
      this.skyline.position.set(w / 2, 0);
      this.grass.width = w * 1.05;
      this.grass.scale.y = this.grass.scale.x;
      this.grass.position.set(w / 2, portrait ? h - footerH + 8 : h + 5);
      this.clouds.forEach((cloud, i) => {
        cloud.width = Math.max(120, w * (0.16 + i * 0.035));
        cloud.scale.y = cloud.scale.x;
        cloud.y = h * (0.1 + i * 0.075);
      });
      const featureMode = this.mode !== "base";
      if (!portrait) {
        // Original landscape Rqa/Sqa and Spine scale: upper-right logo.
        const designUnit = Math.min(w / 1920, h / 1080);
        fitSpine(this.logo, 1, 1);
        this.logo.scale.set(0.2 * designUnit);
        this.logo.position.set(w * 0.893, h * 0.13);
      } else {
        const logoW = Math.min(w * 0.3, 250);
        fitSpine(this.logo, logoW, logoW * (featureMode ? 0.5 : 0.72));
        this.logo.position.set(w / 2, featureMode ? h * 0.045 : h * 0.04);
      }
      fitSpine(this.backgroundAnim, w, h);
      this.backgroundAnim.position.set(w / 2, h / 2);
      this.birds.forEach((bird, index) => {
        const state = this.birdStates[index];
        const targetWidth = Math.max(state.minWidth, w * state.widthRatio);
        const scale = targetWidth / bird.texture.width;
        bird.scale.set(scale * state.direction, scale);
      });
      this.layoutSourceBackground(portrait);
      // Landscape board keeps the source width ratio (0.53 × stage width); the
      // original scales the whole 1920 stage by w/1920 and does not cap the
      // board by available height — the artwork's lower brickwork is meant to
      // run behind the footer at short landscape aspects (see the supplied
      // 728×421 reference frame).
      let boardW = portrait ? w * 0.96 : w * 0.53;
      // The original reel artwork is 523×603 in both orientations. Landscape
      // keeps that full frame centred at (0.5,0.5); its upper locked rows and
      // lower brickwork intentionally extend into the surrounding scene.
      let boardH = boardW * 603 / 523;
      if (portrait) {
        // Portrait boards already fit: w×0.96 with a 603/523 aspect stays well
        // inside tall screens; keep the source sizing untouched there.
      } else if (boardH > (h - footerH) * 0.9) {
        // Fit the whole board inside the visible container with headroom: the
        // idle regular-spin window must look zoomed OUT, never running off the
        // top or bottom of the screen. Reduce the board uniformly (width
        // follows the 523:603 artwork ratio) so all asset positions scale as
        // one container.
        boardH = (h - footerH) * 0.9;
        boardW = boardH * 523 / 603;
      }
      const boardX = (w - boardW) / 2;
      // HNPHR portrait settings place reelParentContainer at (0.5, 0.57);
      // landscape uses the unshifted (0.5,0.5) anchor.
      const boardY = portrait ? h * 0.57 - boardH / 2 : h / 2 - boardH / 2;
      this.board = { x: boardX, y: boardY, width: boardW, height: boardH };
      const sideW = Math.max(0, (w - boardW) / 2);
      this.girder.layout(this.board, portrait);
      this.reels.layout(boardX, boardY, boardW, boardH, this.activeRows, this.mode !== "base", portrait);
      const boardUnit = boardW / 523;
      this.constructionPipes.scale.set(boardUnit);
      this.constructionPipes.position.set(w / 2, boardY - (portrait ? 16 : 13.5) * boardUnit);
      this.constructionBeam.width = boardW * 1.005;
      this.constructionBeam.scale.y = this.constructionBeam.scale.x;
      this.constructionBeam.position.set(w / 2, boardY + (portrait ? 9 : 15));
      this.waysText.position.set(w / 2, boardY - 20);
      this.waysText.style.fontSize = 20;
      this.waysTextRight.visible = true;
      // Original ways panels flank the reels in both orientations. Landscape
      // uses CAa=(.5,.51) and Nua/Xxa=(±510,300) around that anchor.
      this.waysPanels.forEach((panel) => { panel.visible = true; });
      if (portrait) {
        const panelW = boardW * 24 / 523;
        const cellH = boardH * 494 / 603 / 6;
        const panelTop = boardY + boardH * 30 / 603 + (6 - this.activeRows) * cellH;
        const panelH = this.activeRows * cellH;
        const panelY = panelTop + panelH / 2;
        // Original portrait offsets: x=-515/+517 around the 523-unit board.
        this.waysPanels[0].position.set(boardX + 4 * boardUnit, panelY);
        this.waysPanels[1].position.set(boardX + 519 * boardUnit, panelY);
        this.waysPanels.forEach((panel) => { panel.width = panelW; panel.height = panelH; });
        this.waysText.position.set(this.waysPanels[0].x, panelY);
        this.waysText.rotation = 0;
        this.waysText.visible = true;
        this.waysTextRight.position.set(this.waysPanels[1].x, panelY);
        this.waysTextRight.rotation = 0;
      } else {
        // The source panels flank the active symbol window, not the full stage.
        // Derive both axes from the fitted board so height-capped desktop boards
        // never leave the old 510/512-stage-unit panels floating outside it.
        const panelW = boardW * 24 / 523;
        const cellH = boardH * 494 / 603 / 6;
        const panelTop = boardY + boardH * 30 / 603 + (6 - this.activeRows) * cellH;
        const panelH = this.activeRows * cellH;
        const panelY = panelTop + panelH / 2;
        const positions = [boardX + 4 * boardUnit, boardX + 519 * boardUnit];
        this.waysPanels.forEach((panel, index) => {
          panel.position.set(positions[index], panelY);
          panel.width = panelW;
          panel.height = panelH;
        });
        this.waysText.position.set(positions[0], panelY);
        this.waysTextRight.position.set(positions[1], panelY);
        this.waysText.rotation = 0;
        this.waysTextRight.rotation = 0;
      }
      const wayFont = Math.max(8, this.waysPanels[0].width * 0.43);
      this.waysText.style.fontSize = wayFont;
      this.waysText.style.lineHeight = wayFont * 1.02;
      this.waysTextRight.style.fontSize = wayFont;
      this.waysTextRight.style.lineHeight = wayFont * 1.02;
      // Centre the tips inside the board's upper wooden beam (texture rows
      // 0-30 of 603). Their content height is fitted to 0.9x the beam below.
      this.tipRoot.position.set(boardX + boardW / 2, boardY + boardH * 30 / 603 * 0.5);
      this.tipRoot.scale.set(boardW / 523);
      const landscapeUnit = portrait ? 0 : w / 1920;
      const landscapeOffsetY = portrait ? 0 : (h - 1920 * landscapeUnit) / 2;
      if (portrait) {
        this.featureMeter.position.set(boardX + boardW * 0.105, boardY + boardH * 0.935);
        this.featureTally.position.set(boardX + boardW * 0.53, boardY + boardH * 0.94);
      } else {
        // R_.i8 landscape meter origin (232,1350), scale .85. The local
        // sprite is centre-anchored, so offset it above that container origin.
        this.featureMeter.position.set(232 * landscapeUnit, landscapeOffsetY + 1295 * landscapeUnit);
        this.featureTally.position.set(w / 2, h * 0.902);
      }
      const meterW = portrait ? boardW * 0.18 : 266 * 0.85 * landscapeUnit;
      // The supplied desktop tally occupies about 27% of the 16:9 game width.
      // Keep its natural 726×86 proportions instead of stretching it.
      const tallyW = portrait ? boardW * 0.39 : 726 * 0.72 * landscapeUnit;
      const tallyH = tallyW * 86 / 726;
      this.featureMeter.children[0].width = meterW;
      this.featureMeter.children[0].scale.y = this.featureMeter.children[0].scale.x;
      this.featureTally.children[0].width = tallyW;
      this.featureTally.children[0].height = tallyH;
      this.featureText.position.set(0, 0);
      // Artwork-relative centres: the yellow caption field is centred at
      // x=208 and the red amount field at x=555 in the 726×86 source frame.
      // The red field is slightly right of the old estimated 0.255 offset.
      this.featureTotalCaption.position.set(tallyW * (208 / 726 - 0.5), 0);
      this.featureTotalText.position.set(tallyW * (555 / 726 - 0.5), 0);
      this.featureText.style.fontSize = Math.max(10, boardW * 0.026);
      this.featureText.style.lineHeight = Math.max(11, boardW * 0.029);
      this.featureTotalCaption.style.fontSize = portrait ? Math.max(9, boardW * 0.022) : Math.max(10, tallyH * 0.46);
      this.featureTotalText.style.fontSize = portrait ? Math.max(10, boardW * 0.025) : Math.max(11, tallyH * 0.5);
      if (!portrait) {
        this.featureTotalCaption.style.fontFamily = "Game Noto Sans";
        this.featureTotalCaption.style.fontWeight = "900";
        this.featureTotalText.style.fontFamily = "Game Noto Sans";
        this.featureTotalText.style.fontWeight = "900";
      }
      this.featureMeter.visible = featureMode;
      this.featureTally.visible = featureMode;
      // The win amount rests on the board's lower brickwork (below the symbol
      // window), so it never lays over the reels, frames, or houses.
      this.winResultText.position.set(w / 2, boardY + boardH * 0.92);
      this.winResultText.style.fontSize = Math.max(20, boardW * 0.052);
      // Use the supplied base-game lower_grass artwork instead of the four
      // board-front bushes. Its top follows the fitted reel window's lower
      // edge; its full-screen width and uniform scale remain fluid on resize.
      this.foregroundGrass.width = w;
      this.foregroundGrass.scale.y = this.foregroundGrass.scale.x;
      this.foregroundGrass.position.set(w / 2, boardY + boardH * 0.88);
      if (portrait) {
        const meterW = w * 0.35;
        this.jackpots.forEach((jackpot, i) => {
          const left = i === 0 || i === 2;
          const top = i < 2;
          jackpot.root.position.set(w * (left ? 0.19 : 0.82), h * (top ? 0.066 : 0.142));
          jackpot.meter.width = meterW;
          jackpot.meter.scale.y = jackpot.meter.scale.x;
          const meterScale = jackpot.meter.scale.x;
          jackpot.caption.scale.set(1 / meterScale);
          jackpot.caption.width = meterW * 0.52;
          jackpot.caption.scale.y = jackpot.caption.scale.x;
          jackpot.caption.y = -meterW * 0.22 / meterScale;
          jackpot.caption.anchor.set(left ? 0 : 1, 0.5);
          jackpot.caption.x = (left ? -meterW * 0.5 : meterW * 0.5) / meterScale;
          jackpot.valueBaseScale = 1 / meterScale;
          jackpot.maxValueWidth = meterW * 0.82;
          jackpot.value.y = 0;
          jackpot.value.style.fontSize = Math.max(22, meterW * 0.125);
          jackpot.value.style.stroke = { color: 0xffffff, width: jackpot.value.style.fontSize * 5.2 / 150 };
          this.fitJackpotValue(jackpot);
        });
      } else {
        // Original landscape jackpotPanel settings, relative to screen centre.
        const unit = Math.min(w / 1920, h / 1080);
        // The source desktop UI reads slimmer than the artwork's 2× design
        // scale; a 0.85 trim keeps the meter stack proportionate to the slimmed
        // footer and control cluster.
        const meterUnit = unit * 0.85;
        const positions = [[-762, -430], [-779, -308], [-805, -193], [-824, -85]];
        const captions = [[-130, -60], [-115, -60], [-95, -55], [-91, -55]];
        this.jackpots.forEach((jackpot, i) => {
          // Register the source composition to the supplied 1594×898 desktop
          // frame: +9.6/+21.7 design units for the complete caption+meter group.
          jackpot.root.position.set(w / 2 + (positions[i][0] + 9.6) * unit, h / 2 + (positions[i][1] + 21.7) * unit);
          jackpot.meter.scale.set(2 * meterUnit);
          // Source captions and values are children of their meter. Convert the
          // screen-design caption offset into meter-local coordinates instead of
          // applying the design unit a second time to an independent sibling.
          jackpot.caption.scale.set(1);
          jackpot.caption.anchor.set(0.5);
          // The meter artwork is authored at 2× design size; with the 0.85
          // slim the meter scale is 1.7·unit, so the caption's meter-local
          // offset is design/1.7 to keep the source screen offset (design·unit).
          jackpot.caption.position.set(captions[i][0] / 1.7, captions[i][1] / 1.7);
          // Source ma offsets are -3/-4/-3/-3. The per-tier additions convert
          // the original SDF baselines to Pixi using the supplied desktop frame.
          const valueY = [3, -1, -1, -1];
          const valueFontFactors = [0.16, 0.14, 0.121, 0.121];
          const valueDesignWidths = [226.4, 168.6, 172.2, 145.7];
          jackpot.value.position.set(0, valueY[i]);
          jackpot.valueBaseScale = 1 / (2 * meterUnit);
          jackpot.maxValueWidth = valueDesignWidths[i] * meterUnit;
          // Sprite.width includes the overhanging caption once children are
          // attached; source text sizing uses the meter artwork's own width.
          const meterScreenWidth = jackpot.meter.texture.width * 2 * meterUnit;
          jackpot.value.style.fontSize = Math.max(17, meterScreenWidth * valueFontFactors[i]);
          jackpot.value.style.stroke = { color: 0xffffff, width: jackpot.value.style.fontSize * 5.2 / 150 };
          this.fitJackpotValue(jackpot);
          // Narrow landscape windows (e.g. ~900px wide) push the left meters
          // off-screen at the source design offsets. Keep every caption+meter
          // group fully inside the container without rescaling the artwork.
          const groupBounds = jackpot.root.getBounds();
          const margin = 4;
          if (groupBounds.x < margin) jackpot.root.x += margin - groupBounds.x;
          const rightOverflow = groupBounds.x + groupBounds.width - (w - margin);
          if (rightOverflow > 0) jackpot.root.x -= rightOverflow;
        });
      }
      this.bottomBar.clear().rect(0, h - footerH, w, footerH).fill(398155);
      this.bottomBar.moveTo(0, h - footerH).lineTo(w, h - footerH).stroke({ color: 2180768, width: 2 });
      // Original landscape Bottom Bar uses side-by-side label/value meters at
      // 20%, 50% and 80%; only the portrait variant uses the stacked layout.
      // Landscape meter row sits at 40% of footer height and the game-name/
      // clock row near the bottom edge (supplied 728×421 frame: meter glyphs
      // y≈398-407, name glyphs y≈414-418, footer top ≈390).
      this.balanceText.position.set(w * (portrait ? 0.19 : 0.2), h - footerH * (portrait ? 0.62 : 0.6));
      this.winText.position.set(w * 0.5, h - footerH * (portrait ? 0.62 : 0.6));
      this.betText.position.set(w * 0.8, h - footerH * (portrait ? 0.62 : 0.6));
      const fontSize = portrait ? Math.max(12, Math.min(15, w * 0.036)) : 13;
      [this.balanceText, this.winText, this.betText].forEach((text) => {
        text.style.fontSize = fontSize;
      });
      this.footerGame.position.set(7, h - (portrait ? 9 : footerH * 0.16));
      this.footerTime.position.set(w - 7, h - (portrait ? 9 : footerH * 0.16));
      this.footerGame.style.fontSize = 8;
      this.footerTime.style.fontSize = 8;
      if (portrait) {
        const primaryY = boardY + boardH * 0.91;
        const grassY = h - footerH - Math.max(30, h * 0.048);
        this.spinBackdrop.visible = true;
        this.autoBackdrop.visible = true;
        this.betBackdrop.visible = true;
        this.betIcon.visible = true;
        this.spinBackdrop.width = w * 0.245;
        this.spinBackdrop.scale.y = this.spinBackdrop.scale.x;
        this.spinBackdrop.position.set(w * 0.5, grassY);
        this.spinButton.fit(w * 0.22).position.set(w * 0.5, grassY);
        this.autoSpinDisplay.width = w * 0.22;
        this.autoSpinDisplay.scale.y = this.autoSpinDisplay.scale.x;
        this.autoSpinDisplay.position.set(w * 0.5, grassY);
        this.autoBackdrop.width = w * 0.12;
        this.autoBackdrop.scale.y = this.autoBackdrop.scale.x;
        this.autoBackdrop.position.set(w * 0.82, primaryY);
        this.autoButton.fit(w * 0.095).position.set(w * 0.82, primaryY);
        this.buyButton.fit(w * 0.105).position.set(w * 0.095, primaryY);
        this.menuButton.fit(w * 0.105).position.set(w * 0.085, grassY);
        this.turboButton.fit(w * 0.09).position.set(w * 0.26, grassY);
        this.betBackdrop.width = w * 0.29;
        this.betBackdrop.height = w * 0.1;
        this.betBackdrop.position.set(w * 0.8, grassY);
        this.stakeHit.position.copyFrom(this.betBackdrop.position);
        this.stakeHit.scale.set(this.betBackdrop.scale.x);
        this.betIcon.width = w * 0.065;
        this.betIcon.scale.y = this.betIcon.scale.x;
        this.betIcon.position.set(w * 0.79, grassY);
        this.plusButton.fit(w * 0.07).position.set(w * 0.915, grassY);
        this.minusButton.fit(w * 0.07).position.set(w * 0.70, grassY);
        this.soundButton.visible = false;
      } else {
        // Original GDM landscape footer cluster (readable app rAa, RH):
        // every offset is a design unit on the 1920-wide stage (unit=w/1920),
        // anchored to the footer container whose landscape height b=75. The
        // 305×116 stake container sits right-bottom-anchored with ma
        // (-200, -(b+16)); its 305×90 backdrop and children (stake 0.5/0.5,
        // increase 0.8/0.5, decrease 0.2/0.5) are children of the backdrop.
        const unit = w / 1920;
        const footerTopY = h - footerH;
        const rightX = w - 200 * unit;
        // The source controls read slimmer than the original 0.85 reduction the
        // first implementation used; the user asked for a less "fat" desktop
        // cluster, so every control shrinks by SLIM while keeping the source
        // offsets and positions.
        const SLIM = 0.85;
        this.spinBackdrop.visible = false;
        this.autoBackdrop.visible = false;
        this.betBackdrop.visible = true;
        this.betIcon.visible = true;
        // Spin button: P(1, 0.5), Eb(0.5, 0.5), ma(-200, 0); artwork 240.
        const spinSize = 240 * unit * SLIM;
        this.spinButton.fit(spinSize).position.set(rightX, h / 2);
        this.autoSpinDisplay.width = spinSize;
        this.autoSpinDisplay.scale.y = this.autoSpinDisplay.scale.x;
        this.autoSpinDisplay.position.copyFrom(this.spinButton.position);
        // Stake panel bottom-center at (rightX, footerTop - 16·unit).
        const panelBottomY = footerTopY - 16 * unit;
        const panelCenterY = panelBottomY - 45 * unit * SLIM;
        this.betBackdrop.width = 305 * unit * SLIM;
        this.betBackdrop.height = 90 * unit * SLIM;
        this.betBackdrop.position.set(rightX, panelCenterY);
        this.stakeHit.position.copyFrom(this.betBackdrop.position);
        this.stakeHit.scale.set(this.betBackdrop.scale.x);
        this.betIcon.width = 68 * unit * SLIM;
        this.betIcon.scale.y = this.betIcon.scale.x;
        this.betIcon.position.set(rightX, panelCenterY);
        this.plusButton.fit(76 * unit * SLIM).position.set(rightX + 0.3 * 305 * unit * SLIM, panelCenterY);
        this.minusButton.fit(76 * unit * SLIM).position.set(rightX - 0.3 * 305 * unit * SLIM, panelCenterY);
        // Autoplay: same right column, bottom-center (rightX, footerTop - 146·unit).
        const autoSize = 115 * unit * SLIM;
        this.autoButton.fit(autoSize).position.set(rightX, footerTopY - 146 * unit * SLIM - autoSize / 2);
        // Turbo: bottom-left (210, footerTop - 16), artwork 110.
        const turboSize = 110 * unit * SLIM;
        this.turboButton.fit(turboSize).position.set(210 * unit + turboSize / 2, footerTopY - 16 * unit - turboSize / 2);
        // Menu: bottom-left (40, footerTop - 6), burger artwork 100.
        const menuSize = 100 * unit * SLIM;
        this.menuButton.fit(menuSize).position.set(40 * unit + menuSize / 2, footerTopY - 6 * unit - menuSize / 2);
        // Buy Pass: bottom-left (40, footerTop - 146), badge artwork ~148 tall.
        this.buyButton.fit(100 * unit * SLIM);
        this.buyButton.position.set(40 * unit + this.buyButton.sprite.width / 2, footerTopY - 146 * unit * SLIM - this.buyButton.sprite.height / 2);
        this.soundButton.visible = false;
      }
      this.banner.position.set(w / 2, h * 0.45);
      const bannerScale = Math.min(1, w / 680);
      this.banner.scale.set(bannerScale);
      this.paytable.layout(w, h);
      this.applyBoardCamera();
      this.syncBoardOverlays();
      this.updateControls();
      if (this.modal.visible) this.closeModal();
    });
    __publicField(this, "resizeFrame", 0);
    __publicField(this, "onResize", () => {
      if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = 0;
        if (this.disposed) return;
        // Pixi's resizeTo listener updates the renderer asynchronously. Resize
        // it first so layout never reads the previous orientation's dimensions.
        this.app.resize();
        this.layout();
      });
    });
    __publicField(this, "onKey", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (this.paytable.root.visible) this.paytable.closeOverlay();
        else this.spin();
      } else if (event.code === "Escape") {
        if (this.paytable.root.visible) this.paytable.closeOverlay();
        else if (this.modal.visible) {
          this.closeModal();
          this.paused = false;
        } else this.togglePause();
      } else if (event.code === "KeyT") this.toggleTurbo();
      else if (event.code === "KeyM") {
        this.audio.toggle();
        this.soundButton.text = this.audio.muted ? "SOUND OFF" : "SOUND ON";
      }
    });
    __publicField(this, "onVisibility", () => {
      if (document.hidden) {
        if (this.state !== "title" && !this.paused) this.togglePause();
      } else if (this.paused) {
        // Coming back to the tab resumes the game silently; without this the
        // auto-pause had no mobile resume path and the game looked frozen.
        this.paused = false;
        this.updateControls();
      }
    });
    this.bet = this.platform.getBet();
    if (!BET_LEVELS.includes(this.bet)) this.bet = DEFAULT_BET;
    const params = new URLSearchParams(window.location.search);
    const requestedScenario = params.get("scenario");
    if (VALID_SCENARIOS.includes(requestedScenario)) this.scenario = requestedScenario;
    this.baseSeed = Number(params.get("seed")) || this.platform.createSeed();
    const initial = this.platform.initial({
      bet: this.bet,
      mode: "base",
      activeRows: 3,
      frames: this.frames,
      freeSpinIndex: 0,
      scenario: "random",
      seed: this.baseSeed
    });
    this.grid = initial.grid;
    this.characterLayer.label = "FeatureCharactersBelowFooter";
    this.app.stage.addChild(this.background, this.gameLayer, this.unlockLayer, this.characterLayer, this.uiLayer, this.effects, this.modal, this.titleScreen);
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    this.sky = new Sprite(atlases.baseBackgroundNew.texture("basegame_bkg_sky"));
    this.skyline = new Sprite(atlases.baseBackgroundNew.texture("basegame_bkg_top"));
    this.skyline.anchor.set(0.5, 0);
    this.grass = new Sprite(atlases.base.texture("lower_grass"));
    this.grass.anchor.set(0.5, 1);
    this.foregroundGrass = new Sprite(atlases.base.texture("lower_grass"));
    this.foregroundGrass.label = "BaseGameLowerGrassForeground";
    this.foregroundGrass.anchor.set(0.5, 0);
    this.foregroundGrass.eventMode = "none";
    this.logo = spines.create("logo", "idle");
    this.backgroundAnim = spines.create("background", "animation");
    this.girder = new HangingGirder(atlases, spines, this.audio);
    // The Bacon Bros sign renders in its own layer behind the reel board, so
    // the board frame covers its two wooden legs like the original.
    this.billboardLayer = new Container();
    this.billboardLayer.label = "billboardBehindReels";
    this.billboardLayer.addChild(this.girder.billboard);
    this.pig1 = this.girder.pig1;
    this.pig2 = this.girder.pig2;
    this.pig3 = this.girder.pig3;
    this.hangingHats = this.girder.hats;
    // Reuse the supplied 16-frame bird flight with independent paths. Mirroring
    // changes direction; scale, speed, height, phase, and starting offset keep
    // the flock varied without introducing substitute artwork.
    const birdSettings = [
      { direction: 1, speed: 72, widthRatio: 0.034, minWidth: 22, heightRatio: 0.14, phase: 0.4, offset: 0.08, playback: 1 },
      { direction: -1, speed: 54, widthRatio: 0.025, minWidth: 17, heightRatio: 0.23, phase: 2.2, offset: 0.57, playback: 0.86 },
      { direction: 1, speed: 91, widthRatio: 0.02, minWidth: 14, heightRatio: 0.3, phase: 4.1, offset: 0.73, playback: 1.14 },
      { direction: -1, speed: 64, widthRatio: 0.03, minWidth: 20, heightRatio: 0.09, phase: 1.3, offset: 0.31, playback: 0.94 }
    ];
    this.birdStates = birdSettings;
    this.birds = birdSettings.map((state) => {
      const bird = new AnimatedSprite(atlases.birds.animation("Bird"));
      bird.anchor.set(0.5);
      bird.animationSpeed = atlases.birds.fps / 60 * state.playback;
      bird.autoUpdate = false;
      bird.play();
      return bird;
    });
    this.legacyBackground.label = "LegacyPortraitBackground";
    this.legacyBackground.addChild(this.sky, this.backgroundAnim, this.skyline, this.grass, ...this.birds);
    ["cloud_A", "cloud_B", "cloud_C"].forEach((name) => {
      const cloud = new Sprite(atlases.baseBackgroundNew.texture(name));
      cloud.anchor.set(0.5);
      cloud.alpha = 0.7;
      this.clouds.push(cloud);
      this.legacyBackground.addChild(cloud);
    });
    this.background.addChild(this.legacyBackground);
    this.createSourceBackground();
    this.boardCamera.label = "OriginalLandscapeBoardCamera";
    this.girderCamera.label = "OriginalLandscapeGirderCamera";
    this.boardEffects.label = "BoardSymbolEffects";
    this.girderCamera.addChild(this.girder.root);
    this.gameLayer.addChild(this.boardCamera, this.girderCamera, this.foregroundGrass, this.logo);
    this.reels = new ReelSet(atlases, this.grid, spines);
    for (let i = 0; i < 2; i++) {
      const panel = new Sprite(atlases.base.texture("side_pannel"));
      panel.anchor.set(0.5);
      this.waysPanels.push(panel);
      this.boardCamera.addChild(panel);
    }
    this.constructionPipes = new Sprite(atlases.base.texture("bg_pipe"));
    this.constructionPipes.label = "constructionBeamBehindReels";
    this.constructionPipes.anchor.set(0.5);
    this.constructionBeam = new Sprite(atlases.base.texture("scaffoldings_floor_top"));
    this.constructionBeam.anchor.set(0.5);
    const meter = new Sprite(atlases.freespin.texture("fs_meter"));
    meter.anchor.set(0.5);
    const tally = new Sprite(atlases.freespin.texture("total_win_tally"));
    tally.anchor.set(0.5);
    this.featureMeter.addChild(meter, this.featureText);
    this.featureTally.addChild(tally, this.featureTotalCaption, this.featureTotalText);
    this.createUpperTips();
    this.winResultText.anchor.set(0.5);
    this.winResultText.visible = false;
    this.winResultText.style = new TextStyle({ fontFamily: "Arial Black, Arial", fontSize: 42, fontWeight: "900", fill: 16777215, align: "center", stroke: { color: 1289745, width: 6 }, dropShadow: { color: 0, blur: 4, distance: 3 } });
    this.boardCamera.addChild(this.constructionPipes, this.constructionBeam, this.billboardLayer, this.reels.root, ...this.waysPanels, this.tipRoot, this.waysText, this.waysTextRight, this.boardEffects);
    this.waysText.anchor.set(0.5);
    this.waysTextRight.anchor.set(0.5);
    this.featureText.anchor.set(0.5);
    this.featureTotalText.anchor.set(0.5);
    this.featureTotalCaption.anchor.set(0.5);
    this.createJackpots();
    // Bottom-board readouts stay above the screen-space foreground grass.
    this.uiLayer.addChild(this.bottomBar, this.balanceText, this.betText, this.winText, this.soundButton, this.footerGame, this.footerTime, this.featureMeter, this.featureTally, this.winResultText);
    for (const text of [this.balanceText, this.betText, this.winText]) text.anchor.set(0.5);
    this.footerGame.anchor.set(0, 0.5);
    this.footerTime.anchor.set(1, 0.5);
    this.spinButton = new SpriteButton(atlases.ui.texture("spin"), () => this.spin(), atlases.ui.texture("spinDisabled"), atlases.ui.texture("spinClicked"));
    this.autoSpinDisplay = new Sprite(atlases.autospins);
    this.autoSpinDisplay.anchor.set(0.5);
    this.autoSpinDisplay.visible = false;
    // Decorative counter overlay; 'none' keeps its frame from swallowing
    // play-button taps.
    this.autoSpinDisplay.eventMode = "none";
    this.autoSpinCount = label("0", 40, 16777215);
    this.autoSpinCount.anchor.set(0.5);
    this.autoSpinDisplay.addChild(this.autoSpinCount);
    this.autoButton = new SpriteButton(atlases.ui.texture("autoplay"), () => this.autoplay(), atlases.ui.texture("autoplayDisabled"), atlases.ui.texture("autoplayClicked"));
    this.turboButton = new SpriteButton(atlases.ui.texture("turbo"), () => this.toggleTurbo(), atlases.ui.texture("turboDisabled"), atlases.ui.texture("turboClicked"));
    // While paused the hamburger resumes the game instead of opening the menu.
    this.menuButton = new SpriteButton(atlases.ui.texture("burger"), () => (this.paused ? this.togglePause() : this.showMainMenu()), atlases.ui.texture("burgerDisabled"), atlases.ui.texture("burgerClicked"));
    this.plusButton = new SpriteButton(atlases.ui.texture("plus"), () => this.changeBet(1), atlases.ui.texture("plusDisabled"), atlases.ui.texture("plusClicked"));
    this.minusButton = new SpriteButton(atlases.ui.texture("minus"), () => this.changeBet(-1), atlases.ui.texture("minusDisabled"), atlases.ui.texture("minusClicked"));
    this.buyButton = new SpriteButton(atlases.buypass.texture("buypass_button_base"), () => this.showBuyPass(), atlases.buypass.texture("buypass_button_disabled"), atlases.buypass.texture("buypass_button_press"));
    this.spinBackdrop = new Sprite(atlases.ui.texture("spinBackground"));
    this.autoBackdrop = new Sprite(atlases.ui.texture("autoplayBackground"));
    this.betBackdrop = new Sprite(atlases.ui.texture("betBackground"));
    // Decorative panel artwork; the invisible stakeHit rect below provides
    // the tap target. 'none' stops its frame from swallowing hits.
    this.betBackdrop.eventMode = "none";
    this.betIcon = new Sprite(atlases.ui.texture("bet"));
    // Decorative coin on the stake panel; 'none' keeps its frame from
    // swallowing the panel tap in the event boundary.
    this.betIcon.eventMode = "none";
    for (const sprite of [this.spinBackdrop, this.autoBackdrop, this.betBackdrop, this.betIcon]) sprite.anchor.set(0.5);
    this.spinBackdrop.alpha = 0.58;
    this.autoBackdrop.alpha = 0.58;
    // Tapping the stake panel (between the − and + buttons) opens the
    // Select Bet page, matching the supplied reference frame. The hit
    // target is an invisible design-sized rect moved/scaled with the panel:
    // a raw atlas Sprite's own hit test does not register taps in this
    // Pixi build (the SpriteButton containers do), so the panel uses the
    // same container-plus-hit-area pattern they do.
    this.stakeHit = new Container();
    this.stakeHit.hitArea = new Rectangle(-152.5, -45, 305, 90);
    this.stakeHit.eventMode = "static";
    this.stakeHit.cursor = "pointer";
    this.stakeHit.on("pointertap", () => this.showSelectBet());
    this.uiLayer.addChild(this.stakeHit);
    this.uiLayer.addChild(this.spinBackdrop, this.autoBackdrop, this.betBackdrop, this.spinButton, this.autoSpinDisplay, this.autoButton, this.turboButton, this.menuButton, this.plusButton, this.betIcon, this.minusButton, this.buyButton);
    this.soundButton.eventMode = "static";
    this.soundButton.cursor = "pointer";
    this.soundButton.on("pointertap", () => {
      const muted = this.audio.toggle();
      this.soundButton.text = muted ? "SOUND OFF" : "SOUND ON";
      if (!muted && this.mode !== "base") this.audio.startFreeMusic();
    });
    this.soundButton.text = this.audio.muted ? "SOUND OFF" : "SOUND ON";
    this.bannerBg.roundRect(-300, -70, 600, 140, 18).fill({ color: 397630, alpha: 0.95 }).stroke({ color: 16763722, width: 3 });
    this.bannerText.anchor.set(0.5);
    this.bannerText.style = new TextStyle({ fontFamily: "Arial", fontSize: 38, fontWeight: "bold", fill: 16773800, align: "center", dropShadow: { color: 0, blur: 5, distance: 3 } });
    this.banner.addChild(this.bannerBg, this.bannerText);
    this.banner.visible = false;
    this.effects.addChild(this.banner);
    this.paytable = new Paytable(atlases, () => this.audio.play("backToLobby", 0.4));
    this.app.stage.addChild(this.paytable.root);
    this.titleScreen.visible = false;
    this.modal.visible = false;
    this.layout();
    this.updateMeters();
    this.updateControls();
    // Every sound is already cached by the loading screen's full preload.
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS / 1e3));
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    window.visualViewport?.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.__REELSET_DEBUG__ = this.reels;
    window.__slotGame = this;
    window.__slotDebug = {
      snapshot: () => ({
        state: this.paused ? "paused" : this.state,
        elapsed: this.elapsed,
        balance: this.platform.getBalance(),
        bet: this.bet,
        win: this.win,
        activeRows: this.activeRows,
        background: this.sourceBackgroundSnapshot(),
        boardCamera: {
          progress: this.boardCameraProgress,
          scale: this.boardCamera.scale.x,
          girderScale: this.girderCamera.scale.x,
          x: this.boardCamera.x,
          y: this.boardCamera.y,
          stage: window.__BOARD_CAMERA_STAGE__ || "idle"
        },
        featureHatStage: window.__FEATURE_HAT_STAGE__ || null,
        wolfStage: window.__WOLF_STAGE__ || null,
        // Desktop verifier support: screen-space bounds of the footer controls.
        controlBounds: {
          spin: this.controlBounds(this.spinButton),
          auto: this.controlBounds(this.autoButton),
          turbo: this.controlBounds(this.turboButton),
          menu: this.controlBounds(this.menuButton),
          buy: this.controlBounds(this.buyButton),
          plus: this.controlBounds(this.plusButton),
          minus: this.controlBounds(this.minusButton),
          betBackdrop: this.controlBounds(this.betBackdrop),
          betIcon: this.controlBounds(this.betIcon),
          footer: { x: 0, y: this.app.screen.height - this.footerHeight(), width: this.app.screen.width, height: this.footerHeight() }
        },
        ways: this.activeRows ** REELS,
        freeSpins: this.freeSpins,
        freeSpinIndex: this.freeSpinIndex,
        featureWin: this.featureWin,
        feature: this.mode,
        scenario: this.scenario,
        gridMatchesOutcome: this.lastResult ? JSON.stringify(this.grid) === JSON.stringify(this.lastResult.finalGrid) : true,
        actualGridMatchesOutcome: this.lastResult
          ? this.reels.columns.every((column, reel) => column.ids.slice(1, ROWS + 1).every((symbol, row) => symbol === this.lastResult.finalGrid[reel][row]))
          : true,
        framesMatchOutcome: this.lastResult?.framesAfter
          ? this.lastResultSuppressedFrames
            ? this.reels.frames.every((column) => column.every((sprite) => !sprite.visible))
            : JSON.stringify(this.frames) === JSON.stringify(this.lastResult.framesAfter)
          : true,
        visibleFramesMatchOutcome: this.lastResult?.framesAfter
          ? this.lastResultSuppressedFrames
            ? this.reels.frames.every((column) => column.every((sprite) => !sprite.visible)) && this.frameAnimations.length === 0
            : this.reels.frames.every((column, reel) => column.every((sprite, row) => {
              const expected = this.lastResult.framesAfter[reel][row] > 0 && row >= ROWS - this.activeRows;
              const animated = this.frameAnimations.some((item) => item.position.reel === reel && item.position.row === row && item.object.visible && !item.object.destroyed);
              return (sprite.visible || animated) === expected;
            }))
          : true,
        autoplayRemaining: this.autoplayRemaining,
        winResult: { visible: this.winResultText.visible, text: this.winResultText.text },
        paytableValues: this.paytable.root.visible
          ? this.paytable.content.children.filter((child) => typeof child.text === "string").map((child) => child.text)
          : [],
        paytableView: this.paytable.root.visible ? {
          scrollY: this.paytable.scrollY,
          contentY: this.paytable.content.y,
          contentHeight: this.paytable.contentHeight,
          scale: this.paytable.scale,
          viewportY: this.paytable.viewport.y,
          bounds: this.paytable.content.getBounds()
        } : null,
        controls: {
          auto: this.autoButton?.visible ?? false,
          turbo: this.turboButton?.visible ?? false,
          plus: this.plusButton?.visible ?? false,
          minus: this.minusButton?.visible ?? false,
          buy: this.buyButton?.visible ?? false,
          spin: this.spinButton?.visible ?? false
        },
        event: this.lastResult ? {
          type: this.lastResult.girderType,
          thrown: this.lastResult.thrownHats?.length || 0,
          thrownSymbols: this.lastResult.thrownHats?.map((hat) => hat.symbol) || [],
          specials: this.lastResult.specialPositions?.length || 0,
          hats: this.lastResult.hats?.length || 0,
          extraSpin: this.lastResult.extraSpin,
          sawActions: this.lastResult.sawActions?.map((action) => ({ source: action.source, direction: action.direction, targets: action.targets.length })) || [],
          superSawActions: this.lastResult.superSawActions?.length || 0,
          superSawStage: window.__SUPER_SAW_STAGE__ || null,
          sawStage: window.__SAW_STAGE__ || null
        } : null,
        overlays: this.symbolOverlays.length,
        frames: this.frameAnimations.length,
        frameLevels: this.frames.map((column) => [...column]),
        birds: this.birds.map((bird, index) => ({
          x: bird.x,
          y: bird.y,
          width: Math.abs(bird.width),
          direction: this.birdStates[index].direction,
          speed: this.birdStates[index].speed,
          playing: bird.playing
        })),
        characters: [this.pig1, this.pig2, this.pig3].map((pig) => ({
          animation: pig.state.getCurrent(0)?.animation?.name || null,
          trackTime: pig.state.getCurrent(0)?.trackTime || 0,
          duration: pig.state.getCurrent(0)?.animation?.duration || 0,
          timeScale: pig.state.getCurrent(0)?.timeScale,
          stateTimeScale: pig.state.timeScale,
          visible: pig.visible,
          x: pig.getGlobalPosition().x,
          y: pig.getGlobalPosition().y,
          scale: pig.scale.x,
          bounds: pig.getBounds()
        })),
        girder: {
          billboard: {
            visible: this.girder.billboard.visible,
            position: this.girder.billboard.getGlobalPosition(),
            bounds: this.girder.billboard.getBounds(),
            scale: this.girder.billboard.scale.x
          },
          beam: this.girder.beam.getGlobalPosition(),
          beamBounds: this.girder.beam.getBounds(),
          ropes: this.girder.ropes.getGlobalPosition(),
          ropesBounds: this.girder.ropes.getBounds()
        },
        reels: {
          x: this.reels.x,
          y: this.reels.y,
          width: this.reels.width,
          height: this.reels.height,
          mask: this.reels.mask ? { x: this.reels.mask.x ?? 0, y: this.reels.mask.y ?? 0 } : null,
          columns: this.reels.columns.map((column) => ({
            offset: column.offset,
            cellH: column.cellH,
            cellW: column.cellW,
            containerY: column.container.y,
            sprites: column.sprites.slice(0, 8).map((sprite) => ({
              y: sprite.y,
              h: sprite.height,
              visible: sprite.visible
            }))
          }))
        }
      }),
      spin: () => this.spin(),
      showBigWin: async (amount = this.bet * 27) => {
        if (this.state !== "idle") return;
        this.state = "presenting";
        this.updateControls();
        try {
          await this.showNativeBigWin(amount);
        } finally {
          this.state = "idle";
          this.updateControls();
        }
      },
      showFinalTally: async (amount = this.bet * 27) => {
        if (this.state !== "idle") return;
        const previousWin = this.featureWin;
        this.featureWin = amount;
        this.state = "presenting";
        this.updateControls();
        try {
          await this.showFeatureTally();
        } finally {
          this.featureWin = previousWin;
          this.state = "idle";
          this.updateControls();
        }
      },
      setScenario: (scenario) => {
        this.scenario = scenario;
      },
      changeBet: (direction) => this.changeBet(direction),
      autoplay: () => this.autoplay(),
      openPaytable: () => this.openPaytable(),
      closeOverlay: () => {
        this.paytable.closeOverlay();
        this.closeModal();
      }
    };
  }
  createUpperTips() {
    // Board-texture units: the upper beam is 30 units high and every tip item
    // is uniformly fitted to 0.9x that height, then the complete row centered.
    const tipHeight = 30 * 0.9;
    const style = new TextStyle({ fontFamily: "Arial Black, Arial", fontSize: 15, fontWeight: "900", fill: 16777215, stroke: { color: 1529168, width: 3 }, dropShadow: { color: 0, blur: 2, distance: 1 } });
    const tipText = (value) => {
      const text = new Text({ text: value, style: style.clone() });
      text.anchor.set(0.5);
      text.scale.set(tipHeight / text.height);
      return text;
    };
    const tipIcon = (name) => {
      const icon = new Sprite(this.atlases.hats.texture(name));
      icon.anchor.set(0.5);
      icon.height = tipHeight;
      icon.scale.x = icon.scale.y;
      return icon;
    };
    const layoutRow = (root, items, gap) => {
      root.addChild(...items);
      const width = items.reduce((sum, item) => sum + item.width, 0) + gap * (items.length - 1);
      let x = -width / 2;
      items.forEach((item) => {
        item.position.set(x + item.width / 2, 0);
        x += item.width + gap;
      });
    };
    layoutRow(this.tipHazard, [tipIcon("white_saw_static"), tipText("UNLOCKS EXTRA ROWS")], 10);
    layoutRow(this.tipUpgrade, [
      tipIcon("yellow_hat_static"),
      tipText("AND"),
      tipIcon("hat_horizontal_static"),
      tipText("UPGRADE FRAMES IN FREE SPINS")
    ], 8);
    this.tipRoot.addChild(this.tipHazard, this.tipUpgrade);
  }
  fitJackpotValue(jackpot) {
    if (!jackpot.valueBaseScale) return;
    jackpot.value.scale.set(jackpot.valueBaseScale);
    if (jackpot.maxValueWidth && jackpot.value.width > jackpot.maxValueWidth) {
      const fit = jackpot.maxValueWidth / jackpot.value.width;
      jackpot.value.scale.set(jackpot.value.scale.x * fit, jackpot.value.scale.y * fit);
    }
  }
  createJackpots() {
    JACKPOTS.forEach((jackpot) => {
      const root = new Container();
      root.label = `JackpotPanel:${jackpot.label}`;
      const meterName = `${jackpot.label.charAt(0)}${jackpot.label.slice(1).toLowerCase()}_jkp_meter`;
      const meter = new Sprite(this.atlases.base.texture(meterName));
      meter.label = "JackpotMeter";
      meter.anchor.set(0.5);
      const captionName = jackpot.label === "GRAND" ? "grand" : jackpot.label;
      const caption = new Sprite(this.atlases.base.texture(captionName));
      caption.label = "JackpotCaption";
      caption.anchor.set(0.5);
      const value = label("", 22, 16777215);
      value.label = "JackpotValue";
      value.anchor.set(0.5);
      const valueColors = JACKPOT_TEXT_COLORS;
      value.style = new TextStyle({
        fontFamily: "Game Noto Sans",
        fontSize: 120,
        fontWeight: "700",
        fill: verticalGradient([[0, 0xffffff], [0.46, 0xffffff], [0.71, valueColors[jackpot.label]], [1, valueColors[jackpot.label]]]),
        align: "center"
      });
      meter.addChild(caption, value);
      root.addChild(meter);
      this.jackpots.push({ root, meter, caption, value });
      this.gameLayer.addChild(root);
    });
  }
  createSourceBackground() {
    const atlas = this.atlases.baseBackgroundNew;
    this.sourceStage = new Container();
    this.sourceStage.label = "OriginalLandscape1920Stage";
    this.sourceStage.pivot.set(960, 960);

    this.sourceBackground = new Container();
    this.sourceBackground.label = "BackgroundContainer";
    this.sourceBackground.position.set(960, 960);
    this.sourceStage.addChild(this.sourceBackground);

    const sourceSprite = (texture, name) => {
      const sprite = new Sprite(texture);
      sprite.label = name;
      sprite.anchor.set(texture.sourceAnchor.x, texture.sourceAnchor.y);
      return sprite;
    };

    this.sourceSky = sourceSprite(atlas.texture("basegame_bkg_sky"), "SourceSky");
    this.sourceSkyline = sourceSprite(atlas.texture("basegame_bkg_top"), "_bgBottom");
    this.sourceSkyline.position.set(0, 300);

    const cloudNames = ["cloud_A", "cloud_B", "cloud_C"];
    const cloudSettings = [
      { x1: -1250, x2: 2500, duration: 75000 },
      { x1: -1200, x2: 2700, duration: 95000 },
      { x1: -1200, x2: 2500, duration: 125000 }
    ];
    // Original y8a(): shuffled [-300,-150,300], assigned in cloud order.
    const cloudHeights = [-300, -150, 300]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => entry.value);
    this.sourceClouds = cloudNames.map((name, index) => {
      const cloud = sourceSprite(atlas.texture(name), `cloud${index + 1}`);
      cloud.scale.set(-1, 1);
      cloud.position.set(index === 1 ? 2700 : 2500, cloudHeights[index]);
      return cloud;
    });
    this.sourceCloudStates = cloudSettings.map((settings, index) => ({
      ...settings,
      y: cloudHeights[index],
      initialDelay: 3000,
      hold: 500
    }));

    const birdSettings = [
      { y: -450, duration: 12000, scaleX: -0.2, scaleY: 0.3 },
      { y: -250, duration: 16000, scaleX: -0.3, scaleY: 0.3 }
    ];
    this.sourceBirds = birdSettings.map((settings, index) => {
      const bird = new AnimatedSprite(this.atlases.birds.animation("Bird"));
      bird.label = `bird${index + 1}`;
      const anchor = bird.texture.sourceAnchor;
      bird.anchor.set(anchor.x, anchor.y);
      bird.position.set(2500, settings.y);
      bird.scale.set(settings.scaleX, settings.scaleY);
      bird.animationSpeed = this.atlases.birds.fps / 60;
      bird.autoUpdate = false;
      bird.play();
      return bird;
    });
    this.sourceBirdStates = birdSettings.map((settings) => ({
      ...settings,
      x1: -1100,
      x2: 2500,
      initialDelay: 0,
      hold: 500
    }));

    // Hla() child order is significant: sky, three clouds, top art, two birds.
    this.sourceBackground.addChild(
      this.sourceSky,
      ...this.sourceClouds,
      this.sourceSkyline,
      ...this.sourceBirds
    );

    // These are scene-level Float images, separate from the four bushes that
    // overlap the reel board's lower edge. Their full-bitmap stage size is
    // established by the matching supplied 1594x898 landscape frame.
    this.sourceBushes = [0.08, 0.92].map((normalizedX, index) => {
      const bush = new Sprite(this.atlases.bush);
      bush.label = index === 0 ? "bottomBushLeft" : "bottomBushRight";
      bush.anchor.set(0.5);
      bush.position.set(normalizedX * 1920, 0.76 * 1920);
      this.sourceStage.addChild(bush);
      return bush;
    });

    this.background.addChild(this.sourceStage);
    this.sourceStage.visible = false;
  }
  layoutSourceBackground(portrait) {
    if (!this.sourceStage) return;
    const active = ASSET_DEVICE === "desktop" && !portrait;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.sourceStage.visible = active;
    this.legacyBackground.visible = !active;
    if (!active) return;

    // Original mb.Cq/EZ renderer: a 1920x1920 stage with the centred
    // 1920x1080 landscape crop (stage y=420..1500). Local screen mapping is
    // unit=w/1920 with a centred vertical offset, equivalent to this pivot.
    this.sourceStage.pivot.set(960, 960);
    this.sourceStage.position.set(w / 2, h / 2);
    this.sourceStage.scale.set(w / 1920);
    this.sourceBackground.position.set(960, 960);
    this.sourceSkyline.position.set(0, 300);
  }
  updateSourceBackground(dt) {
    if (!this.sourceStage?.visible || this.paused) return;
    this.sourceBackgroundElapsed += dt;
    const elapsedMs = this.sourceBackgroundElapsed * 1000;
    const updatePath = (sprite, state) => {
      const elapsed = elapsedMs - state.initialDelay;
      if (elapsed <= 0) {
        sprite.position.set(state.x2, state.y);
        return;
      }
      const cycle = state.duration + state.hold * 2;
      const local = elapsed % cycle;
      let x = state.x2;
      if (local < state.duration) {
        x = state.x2 + (state.x1 - state.x2) * (local / state.duration);
      } else if (local < state.duration + state.hold) {
        x = state.x1;
      }
      sprite.position.set(x, state.y);
    };
    this.sourceClouds.forEach((cloud, index) => {
      updatePath(cloud, this.sourceCloudStates[index]);
    });
    this.sourceBirds.forEach((bird, index) => {
      bird.update(this.app.ticker);
      const anchor = bird.texture.sourceAnchor;
      bird.anchor.set(anchor.x, anchor.y);
      updatePath(bird, this.sourceBirdStates[index]);
    });
  }
  sourceBackgroundSnapshot() {
    if (!this.sourceStage) return null;
    const sprite = (object) => ({
      label: object.label,
      texture: object.texture?.label || null,
      resolution: object.texture?.source?.resolution ?? null,
      x: object.x,
      y: object.y,
      scaleX: object.scale.x,
      scaleY: object.scale.y,
      anchor: object.anchor ? { x: object.anchor.x, y: object.anchor.y } : null,
      global: object.getGlobalPosition(),
      bounds: object.getBounds()
    });
    return {
      device: ASSET_DEVICE,
      composition: this.sourceStage.visible ? "source-landscape" : "legacy-portrait",
      sourceVisible: this.sourceStage.visible,
      legacyVisible: this.legacyBackground.visible,
      logicalStage: { width: 1920, height: 1920 },
      visibleCrop: { x: 0, y: 420, width: 1920, height: 1080 },
      stage: {
        x: this.sourceStage.x,
        y: this.sourceStage.y,
        scale: this.sourceStage.scale.x,
        pivotX: this.sourceStage.pivot.x,
        pivotY: this.sourceStage.pivot.y
      },
      container: {
        x: this.sourceBackground.x,
        y: this.sourceBackground.y,
        layerOrder: this.sourceBackground.children.map((child) => child.label)
      },
      elapsedMs: this.sourceBackgroundElapsed * 1000,
      backgroundAtlasPixelRatio: this.atlases.baseBackgroundNew.pixelRatio,
      birdAtlasPixelRatio: this.atlases.birds.pixelRatio,
      sky: sprite(this.sourceSky),
      topArt: sprite(this.sourceSkyline),
      clouds: this.sourceClouds.map((cloud, index) => ({
        ...sprite(cloud),
        ...this.sourceCloudStates[index]
      })),
      birds: this.sourceBirds.map((bird, index) => ({
        ...sprite(bird),
        ...this.sourceBirdStates[index],
        currentFrame: bird.currentFrame,
        animationSpeed: bird.animationSpeed,
        playing: bird.playing
      })),
      bushes: this.sourceBushes.map((bush) => sprite(bush))
    };
  }
  update(dt) {
    if (this.disposed) return;
    this.elapsed += dt;
    const showHazardTip = Math.floor(this.elapsed / 5) % 2 === 0;
    this.tipHazard.visible = showHazardTip;
    this.tipUpgrade.visible = !showHazardTip;
    if (!this.paused) {
      const delta = Math.min(dt, 0.05);
      this.reels.update(delta);
      this.girder.update(delta);
      // Spine clips must follow elapsed render time, not the reel physics cap.
      // On slower devices the 50ms reel clamp otherwise makes every awaited
      // pig, tally, wolf, and feature animation run late and visibly stall.
      this.spines.update(dt);
      this.updateSourceBackground(dt);
      const screenW = this.app.screen.width;
      const screenH = this.app.screen.height;
      this.birds.forEach((bird, index) => {
        const state = this.birdStates[index];
        bird.update(this.app.ticker);
        const margin = Math.abs(bird.width) / 2 + 40;
        const travel = screenW + margin * 2;
        const distance = (this.elapsed * state.speed + state.offset * travel) % travel;
        bird.x = state.direction > 0 ? -margin + distance : screenW + margin - distance;
        bird.y = screenH * state.heightRatio + Math.sin(this.elapsed * 1.6 + state.phase) * screenH * 0.008;
      });
    }
    this.clouds.forEach((cloud, i) => {
      cloud.x = (this.elapsed * this.cloudSpeeds[i] + i * 0.31 * (this.app.screen.width + 400)) % (this.app.screen.width + 400) - 200;
      cloud.y += Math.sin(this.elapsed * 0.5 + i) * 0.01;
    });
    window.__GAME_READY__ = true;
  }
  spin() {
    if (this.paytable.root.visible || this.modal.visible || this.paused) return;
    // While autoplay is armed, the play button shows the remaining count and
    // tapping it stops the autoplay sequence instead of spinning.
    if (this.autoplayRemaining > 0) {
      this.autoplayRemaining = 0;
      this.audio.play("click", 0.5);
      this.updateControls();
      return;
    }
    // The supplied session runs with quick-stop disabled. Keep reel input
    // locked until the selected outcome has settled, as in the reference.
    if (this.state !== "idle") return;
    void this.performSpin(false, false);
  }
  isDesktopLandscape() {
    return ASSET_DEVICE === "desktop" && this.app.screen.height / this.app.screen.width <= 1.18;
  }
  isPortraitLayout() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    return h / w > 1.18;
  }
  footerHeight() {
    const h = this.app.screen.height;
    // The source footer strip is slim; the previous 0.073 landscape height
    // read as overly fat on desktop.
    return this.isPortraitLayout() ? Math.max(40, h * 0.0625) : h * 0.06;
  }
  controlBounds(target) {
    const bounds = target.getBounds();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }
  applyBoardCamera() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const progress = this.isDesktopLandscape() ? this.boardCameraProgress : 0;
    // Original DZ/oba: the reel parent keeps absolute design-space children,
    // scales 1↔0.69, and moves its centre from 50% to 58% screen height.
    this.boardCamera.pivot.set(w / 2, h / 2);
    this.boardCamera.position.set(w / 2, h * (0.5 + 0.08 * progress));
    this.boardCamera.scale.set(1 - 0.31 * progress);
    // The hanging component uses the same 0.69 factor, centred horizontally
    // but pivoting at the top vertically, keeping the shrunken pigs above the
    // reels rather than pulling them down with the reel camera's 58% centre.
    this.girderCamera.pivot.set(w / 2, 0);
    this.girderCamera.position.set(w / 2, 0);
    this.girderCamera.scale.set(1 - 0.31 * progress);
    window.__BOARD_CAMERA_DEBUG__ = {
      device: ASSET_DEVICE,
      landscape: this.isDesktopLandscape(),
      progress,
      scale: this.boardCamera.scale.x,
      girderScale: this.girderCamera.scale.x,
      x: this.boardCamera.x,
      y: this.boardCamera.y
    };
  }
  syncBoardOverlays() {
    // Overlays are positioned once when created; a resize (or a feature camera
    // change) relayouts the reels underneath them. Re-derive every overlay
    // from its stored cell so nothing floats off its cell at any screen size.
    for (const overlay of this.symbolOverlays) {
      if (overlay.object.destroyed) continue;
      const point = this.reels.positionOf(overlay.position);
      overlay.object.position.set(point.x, point.y);
      overlay.object.scale.set(overlay.spine ? this.girder.unit : 2 * this.girder.unit);
    }
    for (const frame of this.frameAnimations) {
      if (frame.object.destroyed) continue;
      const point = this.reels.positionOf(frame.position);
      frame.object.position.set(point.x - (frame.level === 2 ? 2 * this.girder.unit : 0), point.y);
      frame.object.scale.set(this.girder.unit);
    }
  }
  setBoardCameraExpanded(expanded, immediate = false) {
    const target = expanded && this.isDesktopLandscape() ? 1 : 0;
    const start = this.boardCameraProgress;
    const generation = ++this.boardCameraGeneration;
    if (immediate || start === target) {
      this.boardCameraProgress = target;
      this.applyBoardCamera();
      window.__BOARD_CAMERA_STAGE__ = target ? "expanded" : "idle";
      return Promise.resolve();
    }
    window.__BOARD_CAMERA_STAGE__ = expanded ? "zoom-out" : "zoom-in";
    return exactTween(1000, (t) => {
      if (generation !== this.boardCameraGeneration) return;
      this.boardCameraProgress = start + (target - start) * t;
      this.applyBoardCamera();
    }).then(() => {
      if (generation === this.boardCameraGeneration) window.__BOARD_CAMERA_STAGE__ = expanded ? "expanded" : "idle";
    });
  }
  prepareRowUnlockAssets() {
    return Promise.all([
      this.spines.ensure(["blastingPig"]),
      ensureAtlases(this.atlases, ["rowsBlast"])
    ]);
  }
  prepareHatAssets() {
    return Promise.all([
      ensureAtlases(this.atlases, ["constructionCloud", "symbolParticle", "yellowHat", "horizontalHat", "verticalHat", "whiteHat", "greenHat", "trailCloud"]),
      this.spines.ensure(["houses"])
    ]);
  }
  prepareFeatureAssets() {
    return Promise.all([
      ensureAtlases(this.atlases, ["freeBackgroundNew", "fsBlast", "wind"]),
      this.spines.ensure(["tally"])
    ]);
  }
  showPersistentFrames() {
    this.reels.showFrames(this.frames, this.frameAnimations.map((item) => item.position));
  }
  async performSpin(free, prepaid) {
    if (this.disposed) return;
    this.state = "spinning";
    this.quickStop = false;
    this.win = 0;
    this.winResultText.visible = false;
    this.reels.clearWinners();
    this.reels.clearHouses();
    this.clearSymbolOverlays();
    const restoreExpandedRows = !free && (this.activeRows !== 3 || this.boardCameraProgress > 0);
    if (!free) this.activeRows = 3;
    this.layout();
    if (restoreExpandedRows) {
      // Original next-spin path: restore three rows and run oba() alongside
      // the new reel motion. Mobile never enters the landscape camera path.
      void this.setBoardCameraExpanded(false);
      this.girder.startBaseIdle();
    }
    this.updateMeters();
    this.updateControls();
    try {
      if (prepaid) await this.platform.debit(this.bet * BUY_PASS_MULTIPLIER);
      else if (!free) await this.platform.debit(this.bet);
    } catch {
      this.state = "idle";
      await this.showBanner("INSUFFICIENT VIRTUAL BALANCE", 1800);
      this.updateMeters();
      this.updateControls();
      return;
    }
    this.updateMeters();
    const baseScenario = prepaid ? this.prepaidScenario === "super" ? "super" : "feature" : this.scenario;
    const scenario = this.mode === "base" ? baseScenario : "random";
    this.prepaidScenario = null;
    const result = await this.platform.spin({
      bet: this.bet,
      mode: this.mode,
      activeRows: this.activeRows,
      frames: this.frames,
      freeSpinIndex: this.freeSpinIndex,
      scenario,
      seed: this.baseSeed + ++this.spinCounter * 7919 >>> 0
    });
    this.lastResult = result;
    // No frames are built in the base-game presentation. On a feature trigger
    // the Free Spins tally comes first; its entry frames are constructed only
    // after that tally has completed.
    const featureTrigger = this.mode === "base" && result.feature !== "none";
    this.lastResultSuppressedFrames = this.mode === "base";
    // Once the supplied outcome is known, decode only the presentation assets
    // it will need while the reels are still moving. This keeps first-use
    // Hazard, girder, hat, and Free Spin assets from adding a post-stop stall.
    const rowAssets = result.unlockedRows > 0 ? this.prepareRowUnlockAssets() : null;
    const girderAssets = result.girderType === "THROW"
      ? ensureAtlases(this.atlases, ["symbolParticle"])
      : result.girderType === "SPIN"
        ? ensureAtlases(this.atlases, ["constructionCloud", "symbolParticle"])
        : null;
    const hatAssets = result.hats.length ? this.prepareHatAssets() : null;
    const featureAssets = this.mode === "base" && result.feature !== "none" ? this.prepareFeatureAssets() : null;
    // Original ZFa.QV() installs VA before reel motion starts. Ordinary Mystery
    // positions therefore stop directly on their replacement symbols; the
    // separate GIRDER_DROP/SPIN reveal remains a post-stop feature sequence.
    const stopGrid = result.grid.map((column) => [...column]);
    if (result.mysteryPositions.length && result.girderType !== "SPIN") {
      for (const position of result.mysteryPositions) {
        stopGrid[position.reel][position.row] = result.finalGrid[position.reel][position.row];
      }
    }
    this.grid = stopGrid;
    this.reels.grid = stopGrid;
    this.audio.stopSfx();
    this.reels.start();
    this.audio.play("spin", 0.4);
    const minimum = this.turbo ? TIMING.turboSpinMinimum : TIMING.spinMinimum;
    const stagger = this.turbo ? TIMING.turboReelStagger : TIMING.reelStagger;
    await this.wait(minimum);
    // Preload every landing sound this outcome can need so each one starts
    // exactly on its reel instead of after a first-fetch delay.
    const landingSounds = ["stop", "stopMid"];
    for (let reel = 0; reel < REELS; reel++) {
      let hasHat = false;
      for (let row = ROWS - this.activeRows; row < ROWS; row++) {
        const symbol = stopGrid[reel][row];
        if (symbol >= 14 && symbol <= 18) hasHat = true;
      }
      if (hasHat) landingSounds.push(`${this.mode === "super" ? "buzzsawLand" : "hardhatLand"}${reel + 1}`, "hat", "whiteHatLand");
    }
    this.audio.preload(landingSounds);
    let confirmLastReelStopped;
    const lastReelStopped = new Promise((resolve) => { confirmLastReelStopped = resolve; });
    for (let reel = 0; reel < REELS; reel++) {
      if (this.disposed) return;
      if (this.quickStop && reel > 0) await this.wait(20);
      this.reels.stopColumn(reel, stopGrid, this.turbo || this.quickStop, () => {
        if (this.disposed) return;
        if (reel === REELS - 1) confirmLastReelStopped();
        this.audio.play("stop", 0.25);
        // Original KY path, fired by the reel itself at its exact visual
        // landing frame: a hat in the window plays the per-reel scatter
        // anticipation sound (buzzsaw variants in Super Saw), a landed yellow
        // hat plays yellow_hat_land live, and a white Hazard hat its swoosh.
        const landed = [];
        for (let row = ROWS - this.activeRows; row < ROWS; row++) {
          const symbol = stopGrid[reel][row];
          if (symbol >= 14 && symbol <= 18) landed.push(symbol);
        }
        if (landed.length) {
          this.audio.play(`${this.mode === "super" ? "buzzsawLand" : "hardhatLand"}${reel + 1}`, 0.45);
          if (landed.includes(18)) this.audio.play("hat", 0.5);
          if (landed.includes(16)) this.audio.play("whiteHatLand", 0.45);
        }
      });
      if (!this.quickStop) await this.wait(stagger);
    }
    // Wait for the actual final landing frame, not a wall-clock estimate.
    // On slower devices the ticker can still be decelerating when the old
    // timeout fired, which skipped win animations and started post-stop
    // presentation while different symbols were still visibly moving.
    await lastReelStopped;
    this.state = "presenting";
    this.updateControls();
    if (result.unlockedRows > 0) {
      await rowAssets;
      const firstHat = result.hats.find((position) => result.grid[position.reel][position.row] === 16);
      this.spinButton.visible = true;
      this.spinButton.setEnabled(false);
      // DZ() completes before the demolition pig enters. Board and girder
      // cameras share the same desktop-only zoom factor with their own pivots.
      await this.setBoardCameraExpanded(true);
      const sequence = new RowUnlockSequence(this.app, this.atlases, this.spines, this.reels, this.unlockLayer, this.audio, this.spinButton, this.boardCamera);
      await sequence.play(result.unlockedRows, result.activeRowsAfter, firstHat?.reel);
      this.updateControls();
      this.activeRows = result.activeRowsAfter;
      this.reels.layout(this.board.x, this.board.y, this.board.width, this.board.height, this.activeRows, this.mode !== "base", this.app.screen.height / this.app.screen.width > 1.18);
      this.updateMeters();
      // oba(): inside Free Spins, return the board to its normal zoom once the
      // demolition pig has finished. The next Free Spin therefore plays at the
      // settled zoom-in view (the recovered "zoom-in effect"), and when this
      // was the final Free Spin the end-of-feature houses are formatted at the
      // zoomed-in board position instead of the 0.69 blast framing. The base
      // game deliberately keeps the expanded framing into idle; the next base
      // spin restores three rows and zooms back in via restoreExpandedRows.
      if (free) await this.setBoardCameraExpanded(false);
    }
    // Original Precog.GirderDrop background: intro stinger, then the loop
    // runs beneath the whole girder event until it resolves.
    const startGirderBackground = () => {
      const state = { intro: this.audio.play("girderIntro", 0.35), loop: null, active: true };
      if (state.intro && !this.audio.muted) {
        state.intro.addEventListener("ended", () => {
          this.audio.sfx.delete(state.intro);
          if (state.active) state.loop = this.audio.playLoop("girderLoop", 0.3);
        }, { once: true });
      }
      return state;
    };
    const stopGirderBackground = (state) => {
      state.active = false;
      this.audio.stop(state.intro);
      this.audio.stop(state.loop);
    };
    let mysteryDropped = false;
    if (result.girderType === "THROW") {
      this.audio.play("girder");
      const girderBg = startGirderBackground();
      await girderAssets;
      await this.girder.playGirderTrigger(
        result.thrownHats,
        (position) => this.boardCamera.toGlobal(this.reels.positionOf(position)),
        (thrown) => this.landHat(thrown)
      );
      stopGirderBackground(girderBg);
      this.grid = result.finalGrid;
    } else if (result.girderType === "SPIN") {
      this.audio.play("girder");
      const girderBg = startGirderBackground();
      await girderAssets;
      await this.girder.playMysteryDrop(
        result.specialPositions,
        (position) => this.boardCamera.toGlobal(this.reels.positionOf(position)),
        (entry) => this.createMysteryOverlay(entry.position),
        this.app.screen.height / this.app.screen.width > 1.18
      );
      mysteryDropped = true;
      stopGirderBackground(girderBg);
      const ordered = [...result.specialPositions].sort((a, b) => a.position.reel - b.position.reel || a.position.row - b.position.row);
      for (const entry of ordered) await playSpecialSymbolReveal(this, entry, result);
      this.grid = result.finalGrid;
      await exactWait(500);
    }
    // A triggering spin keeps its hats visible through the feature tally.
    // startFeature() applies their frame plan after the tally, before the first
    // Free Spin. Non-triggering spins resolve their hat actions immediately.
    if (!featureTrigger) await this.applyHats(result, hatAssets);
    else {
      // A Super Saw trigger must keep the hats as they landed until
      // applyHats() runs the transformation animation; showing finalGrid here
      // would reveal the converted saw hats instantly and make the whole
      // sequence a visual no-op.
      this.grid = result.grid;
      this.reels.grid = result.grid;
      this.reels.frameLayer.visible = false;
    }
    // Live construction Spines own their cells; static sprites fill only
    // unanimated frame state, so a replacement never draws a duplicate frame.
    if (this.mode !== "base") this.showPersistentFrames();
    else this.reels.frameLayer.visible = false;
    const spinWin = Math.round((result.waysWin + result.frameCredit) * 100) / 100;
    this.win = spinWin;
    if (spinWin > 0) {
      await this.platform.credit(spinWin);
      this.reels.highlight(result.wins);
      const primaryWin = result.wins[0];
      if (primaryWin) {
        this.winResultText.text = `${primaryWin.ways} WAY PAY\n${money(primaryWin.amount)}`;
        this.winResultText.visible = true;
      }
      // Ways wins stay silent in the source: the "win" cue belongs to the
      // Freegame tally count-up, not to base/ways hits, so nothing plays here.
    }
    if (free) this.featureWin = Math.round((this.featureWin + spinWin) * 100) / 100;
    this.updateMeters();
    const hasFeature = featureTrigger;
    await this.wait(spinWin > 0 && !hasFeature ? TIMING.resultHold : 400);
    this.winResultText.visible = false;
    // The original removes the dim descriptor when the win display completes
    // (DimmableSymbol.QUa(null) → restore); the grid returns to full
    // brightness for the idle state.
    if (spinWin > 0) this.reels.clearWinners();
    if (spinWin >= this.bet * 25 && !hasFeature) await this.showNativeBigWin(spinWin);
    if (result.feature !== "none" && this.mode === "base") {
      await this.playFeatureHatZoom(result);
      await this.startFeature(result.feature, featureAssets, result, hatAssets);
      return;
    }
    if (free) {
      if (result.extraSpin) {
        this.freeSpins++;
        this.updateMeters();
        await this.showBanner("3+ HARD HATS\n+1 FREE SPIN", 900);
      }
      if (this.freeSpins > 0) {
        this.freeSpins--;
        this.freeSpinIndex++;
        this.updateMeters();
        await this.wait(this.turbo ? 220 : 550);
        await this.performSpin(true, false);
      } else await this.endFeature();
      return;
    }
    // The mystery drop parks the girder high above the reels; the original
    // x6() settles it back to its hanging position once the outcome
    // presentation is done.
    if (mysteryDropped) await this.girder.returnHome();
    this.state = "idle";
    // Rows opened by the demolition pig stay exposed through the settled
    // result. performSpin() restores three rows only when the next base spin
    // actually starts, so the pig leaving never undoes the explosion.
    this.updateMeters();
    this.updateControls();
    if (this.autoplayRemaining > 0) {
      this.autoplayRemaining--;
      await this.wait(300);
      if (!this.paused && !this.modal.visible) await this.performSpin(false, false);
      else this.autoplayRemaining = 0;
    }
  }
  clearSymbolOverlays() {
    for (const overlay of this.symbolOverlays) {
      if (overlay.spine) this.spines.release(overlay.object);
      else overlay.object.destroy();
    }
    this.symbolOverlays = [];
  }
  removeSymbolOverlay(position, restoreCell = true) {
    const remaining = [];
    for (const overlay of this.symbolOverlays) {
      if (overlay.position.reel === position.reel && overlay.position.row === position.row) {
        if (overlay.spine) this.spines.release(overlay.object);
        else overlay.object.destroy();
      } else remaining.push(overlay);
    }
    this.symbolOverlays = remaining;
    if (restoreCell) this.reels.setCellVisible(position, true);
  }
  createMysteryOverlay(position) {
    this.removeSymbolOverlay(position, false);
    const point = this.reels.positionOf(position);
    const mystery = this.spines.create("symbols", "mystery_ideal", true);
    mystery.name = `mystery_idle_spine_${position.reel}_${position.row}`;
    mystery.position.set(point.x, point.y);
    mystery.scale.set(this.girder.unit);
    this.boardEffects.addChild(mystery);
    this.symbolOverlays.push({ position: { ...position }, object: mystery, spine: true, symbol: 13 });
    this.reels.setCellVisible(position, false);
    return mystery;
  }
  async playFeatureHatZoom(result) {
    const animations = {
      14: "yellow_hat_horizontal",
      15: "yellow_hat_vertical",
      16: "white_hat_zoom",
      17: "green_hat_zoom",
      18: "yellow_hat_zoom"
    };
    window.__FEATURE_HAT_STAGE__ = "zoom";
    const playing = [];
    for (const position of result.hats) {
      // Hats zoom as they landed (triggerGrid). Reading finalGrid here would
      // zoom the already-converted Super Saw symbols on a Super Saw trigger.
      const symbol = result.triggerGrid[position.reel][position.row];
      const animation = animations[symbol];
      if (!animation) continue;
      const hat = this.createHatOverlay(position, symbol);
      if (hat) playing.push(this.spines.playWithOptions(hat, animation, { speed: 1.5 }));
    }
    await Promise.all(playing);
    window.__FEATURE_HAT_STAGE__ = "done";
  }
  createHatOverlay(position, symbol) {
    const animations = {
      14: "yellow_hat_horizontal_ideal",
      15: "yellow_hat_vertical_ideal",
      16: "white_hat_ideal",
      17: "green_hat_ideal",
      18: "yellow_hat_ideal"
    };
    const animation = animations[symbol];
    if (!animation) return null;
    this.removeSymbolOverlay(position, false);
    const point = this.reels.positionOf(position);
    const hat = this.spines.create("symbols", animation, true);
    hat.position.set(point.x, point.y);
    hat.scale.set(this.girder.unit);
    this.boardEffects.addChild(hat);
    this.symbolOverlays.push({ position: { ...position }, object: hat, spine: true, symbol });
    this.reels.setCellVisible(position, false);
    return hat;
  }
  playSymbolBlast(position) {
    const point = this.reels.positionOf(position);
    const blast = new AnimatedSprite(this.atlases.symbolParticle.animation("particle"));
    blast.anchor.set(0.5);
    blast.position.set(point.x, point.y + 5 * this.girder.unit);
    blast.scale.set(3 * this.girder.unit);
    blast.blendMode = "add";
    blast.animationSpeed = this.atlases.symbolParticle.fps / 60 * 1.5;
    blast.loop = false;
    this.boardEffects.addChild(blast);
    const complete = new Promise((resolve) => { blast.onComplete = resolve; });
    blast.play();
    return complete.finally(() => blast.destroy());
  }
  landHat(thrown) {
    this.reels.setSymbol(thrown.position, thrown.symbol);
    this.createHatOverlay(thrown.position, thrown.symbol);
    // Original GIG.Yellow_Hat_Land: the girder-thrown hat plays its own
    // landing sound as it settles onto the cell.
    this.audio.play("hat", 0.5);
    // VNa starts the original particle without delaying the next landing.
    void this.playSymbolBlast(thrown.position);
  }
  async replaceWithHat(position, symbol, bounce = true) {
    const settings = {
      14: ["horizontalHat", "hat_horizontal_saw"],
      15: ["verticalHat", "hat_vertical_saw"],
      16: ["whiteHat", "special_hat"],
      17: ["greenHat", "green_hat_supersaw"],
      18: ["yellowHat", "yellow_hat"]
    };
    const [atlasName, animation] = settings[symbol];
    this.reels.setSymbol(position, symbol);
    this.removeSymbolOverlay(position, false);
    this.reels.setCellVisible(position, false);
    const point = this.reels.positionOf(position);
    const hat = new AnimatedSprite(this.atlases[atlasName].animation(animation));
    hat.anchor.set(0.5);
    hat.position.set(point.x, point.y);
    hat.scale.set(2 * this.girder.unit);
    hat.animationSpeed = this.atlases[atlasName].fps / 60;
    hat.loop = false;
    this.boardEffects.addChild(hat);
    this.symbolOverlays.push({ position: { ...position }, object: hat, spine: false, symbol });
    if (bounce) {
      await exactWait(40);
      if (hat.destroyed) return;
      hat.scale.set(2 * this.girder.unit * 1.2);
      void exactTween(400, (t) => {
        if (!hat.destroyed) hat.scale.set(2 * this.girder.unit * (1.2 - 0.2 * t));
      });
    }
    if (!hat.destroyed) hat.play();
  }
  async playSuperSawTransformation(greenPositions, result) {
    const source = greenPositions[0];
    if (!source) return;
    const samePosition = (a, b) => a.reel === b.reel && a.row === b.row;
    const sourcePoint = this.reels.positionOf(source);

    // Original v5a/r5a: rotate the green signs while GreenSawSignRotate plays,
    // then remove them 1,500 ms before that sound ends.
    window.__SUPER_SAW_STAGE__ = "rotate";
    const introSound = this.audio.play("superSawIntro", 0.5);
    const rotatingSigns = greenPositions.map((position) => {
      const point = this.reels.positionOf(position);
      const sign = this.spines.create("symbols");
      sign.position.set(point.x, point.y);
      sign.scale.set(this.girder.unit);
      this.boardEffects.addChild(sign);
      void this.spines.playWithOptions(sign, "green_saw_rotation");
      return sign;
    });
    const soundDuration = await this.audio.duration(introSound);
    await exactWait(Math.max(0, soundDuration * 1000 - 1500));
    for (const sign of rotatingSigns) if (this.spines.instances.has(sign)) this.spines.release(sign);

    // Original AOa: transfer static signs to ordinary/Hazard hats and to
    // non-green girder placements. Naturally landed saw hats are not converted
    // a second time. One remaining supplied action is handled afterwards.
    window.__SUPER_SAW_STAGE__ = "transfer";
    this.audio.play("buzzsawTransform", 0.45);
    const targets = result.hats.filter((position) => {
      if (greenPositions.some((green) => samePosition(green, position))) return false;
      const symbol = result.triggerGrid[position.reel][position.row];
      const thrown = result.thrownHats.some((hat) => samePosition(hat.position, position));
      return symbol === 18 || symbol === 16 || thrown;
    });
    targets.sort((a, b) => a.reel - b.reel || a.row - b.row);
    const remainingActions = [...result.superSawActions].sort((a, b) => a.source.reel - b.source.reel || a.source.row - b.source.row);
    const leftoverIndex = remainingActions.findIndex((action) => !targets.some((target) => samePosition(target, action.source)));
    const leftover = leftoverIndex === -1 ? null : remainingActions.splice(leftoverIndex, 1)[0];
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      const action = remainingActions[index];
      const sign = this.spines.create("symbols");
      this.spines.stop(sign, "static saw");
      sign.position.set(sourcePoint.x, sourcePoint.y);
      sign.scale.set(this.girder.unit);
      this.boardEffects.addChild(sign);
      const targetPoint = this.reels.positionOf(target);
      this.audio.play("hatTransfer", 0.4);
      void exactTween(1000, (t) => {
        if (sign.destroyed) return;
        sign.position.set(sourcePoint.x + (targetPoint.x - sourcePoint.x) * t, sourcePoint.y + (targetPoint.y - sourcePoint.y) * t);
        const scale = t <= 0.5 ? 1 + 4 * t : 3 - 4 * (t - 0.5);
        sign.scale.set(this.girder.unit * scale);
      }).then(() => {
        this.audio.play("hatTransferLand", 0.4);
        if (action) {
          this.audio.play(`superSawLand${Math.min(14, index) + 1}`, 0.35);
          void this.replaceWithHat(target, action.direction === "U" || action.direction === "D" ? 15 : 14, true);
          void this.playSymbolBlast(target);
        }
        if (this.spines.instances.has(sign)) this.spines.release(sign);
      });
      await exactWait(300);
    }

    // Original YRa: the final static sign grows 1→2→1 over 400+400 ms;
    // its remaining action supplies the final position and saw direction.
    await exactWait(200);
    window.__SUPER_SAW_STAGE__ = "source";
    const finalSign = this.spines.create("symbols");
    this.spines.stop(finalSign, "static saw");
    finalSign.position.set(sourcePoint.x, sourcePoint.y);
    finalSign.scale.set(this.girder.unit);
    this.boardEffects.addChild(finalSign);
    await exactTween(400, (t) => { if (!finalSign.destroyed) finalSign.scale.set(this.girder.unit * (1 + t)); });
    await exactTween(400, (t) => { if (!finalSign.destroyed) finalSign.scale.set(this.girder.unit * (2 - t)); });
    for (const green of greenPositions) this.removeSymbolOverlay(green, false);
    if (this.spines.instances.has(finalSign)) this.spines.release(finalSign);
    if (leftover) {
      const regularCount = result.hats.filter((position) => result.triggerGrid[position.reel][position.row] === 18).length;
      // Original Buzzsaw.Land: the final Super Saw sign lands last.
      this.audio.play("superLandBuzzsaw", 0.45);
      this.audio.play(`superSawLand${Math.min(14, regularCount) + 1}`, 0.35);
      await this.replaceWithHat(leftover.source, leftover.direction === "U" || leftover.direction === "D" ? 15 : 14, true);
      void this.playSymbolBlast(leftover.source);
    }
    window.__SUPER_SAW_STAGE__ = "transformed";
    await exactWait(700);
  }
  async playFrameConstruction(position, level, fromLevel = Math.max(0, level - 1)) {
    // The recovered upgrade map is null→straw_in→stick_in→brick_in. Play every
    // intermediate step in order, even if an adapter supplies a multi-level
    // action, and never replace a cell directly with its final higher frame.
    for (let currentLevel = Math.max(1, fromLevel + 1); currentLevel <= level; currentLevel++) {
      const previous = this.frameAnimations.findIndex((item) => item.position.reel === position.reel && item.position.row === position.row);
      if (previous !== -1) {
        this.frameAnimations[previous].object.removeFromParent?.();
        this.spines.release(this.frameAnimations[previous].object);
        this.frameAnimations.splice(previous, 1);
      }
      const point = this.reels.positionOf(position);
      const animation = currentLevel === 1 ? "straw_in" : currentLevel === 2 ? "stick_in" : "brick_in";
      const frame = this.spines.create("houses");
      frame.position.set(point.x - (currentLevel === 2 ? 2 * this.girder.unit : 0), point.y);
      frame.scale.set(this.girder.unit);
      // Board-space layer, not the screen-space effects layer: the frame must
      // ride the board camera (0.69 feature zoom / resize relayout) exactly like
      // the reels and the hat overlays, otherwise it floats off its cell.
      this.boardEffects.addChild(frame);
      this.frameAnimations.push({ position: { ...position }, object: frame, level: currentLevel });
      this.removeSymbolOverlay(position, true);
      window.__FRAME_CONSTRUCTION_STAGE__ = { position: { ...position }, level: currentLevel, animation, startedAt: performance.now() };
      const construction = this.spines.playWithOptions(frame, animation, { speed: 0.7 });
      this.audio.play(currentLevel === 1 ? "frameStraw" : currentLevel === 2 ? "frameStick" : "frameBrick", 0.3);
      await construction;
      if (frame.destroyed || !this.spines.instances.has(frame)) return;
      if (currentLevel === 3) this.spines.playWithOptions(frame, "brick_loop", { loop: true, speed: 0.7 });
    }
  }
  async applyHats(result, preparedAssets = null, featureEntry = false) {
    if (!result.hats.length) return;
    const featureTrigger = (this.mode === "base" || featureEntry) && result.feature !== "none";
    // Ordinary base spins keep landed hats as plain settled symbols: no frame
    // construction, no saw movement, no hat/frame presentation sounds. Frames
    // only appear on Free Spins entries and inside the features themselves.
    if (this.mode === "base" && !featureTrigger) {
      this.grid = result.finalGrid;
      this.reels.setGrid(result.finalGrid, this.activeRows);
      this.reels.frameLayer.visible = false;
      return;
    }
    await (preparedAssets || this.prepareHatAssets());
    const sourceGrid = result.triggerGrid;
    const greenPositions = result.hats.filter((position) => sourceGrid[position.reel][position.row] === 17);
    const superTrigger = (this.mode === "base" || featureEntry) && result.feature === "super" && greenPositions.length > 0;
    if (superTrigger) await this.playSuperSawTransformation(greenPositions, result);
    const samePosition = (a, b) => a.reel === b.reel && a.row === b.row;
    // Frames of the same kind build simultaneously (one concurrent batch);
    // different kinds run as separate batches in level order. Steps that share
    // a cell still serialize through cellChains so their construction Spines
    // never overlap on that cell.
    const cellChains = new Map();
    const pendingSteps = [];
    const runStep = async (action) => {
      const { target, fromLevel, toLevel, credit } = action;
      const key = `${target.reel}:${target.row}`;
      const previous = cellChains.get(key) || Promise.resolve();
      const step = previous.then(async () => {
        if (credit > 0) await this.showCreditAward(target, toLevel, credit);
        if (this.mode === "base" && !featureTrigger) return;
        await this.playFrameConstruction(target, toLevel, fromLevel);
        this.frames[target.reel][target.row] = toLevel;
      });
      cellChains.set(key, step.catch(() => {}));
      pendingSteps.push(step.catch(() => {}));
      await step;
    };
    // Hat-triggered entry frames: every hat of the same level is one batch, so
    // six triggering hats raise six same frames at once, not one after another.
    const hatActions = [];
    for (const position of result.hats) {
      const action = result.frameActions.find((entry) => entry.kind === "hat" && samePosition(entry.source, position));
      // Hat landing sounds fire per reel when the reels stop; here only the
      // ordered frame construction itself sounds.
      if (action) hatActions.push(action);
    }
    const hatLevels = [...new Set(hatActions.map((action) => action.toLevel))].sort((a, b) => a - b);
    for (const level of hatLevels) {
      const batch = hatActions.filter((action) => action.toLevel === level);
      await Promise.all(batch.map(runStep));
    }
    // The tally has already completed when featureEntry is true. The original
    // entry sequence then constructs hat frames and runs every triggering saw.
    const actions = superTrigger ? result.superSawActions : result.sawActions || [];
    if (actions.length) {
      const sequence = new SawSequence(this);
      await sequence.play(actions, superTrigger || this.mode === "super", (target, sawAction) => {
        const frameAction = result.frameActions.find((entry) => entry.kind === "saw" && samePosition(entry.source, sawAction.source) && samePosition(entry.crossed, target));
        // Saw-driven upgrades fire on the saw's crossing schedule; concurrent
        // saws therefore upgrade concurrently, in the same moment batch.
        if (frameAction) void runStep(frameAction);
      });
      await exactWait(1500);
    }
    await Promise.all(pendingSteps);
    if (this.mode !== "base" || featureTrigger) this.frames = result.framesAfter.map((column) => [...column]);
    this.grid = result.finalGrid;
    this.reels.setGrid(result.finalGrid, this.activeRows);
    this.reels.frameLayer.visible = false;
  }
  async startFeature(kind, preparedAssets = null, entryResult = null, entryAssets = null) {
    await (preparedAssets || this.prepareFeatureAssets());
    this.state = "featureIntro";
    this.mode = kind;
    this.freeSpins = FREE_SPINS_AWARDED;
    this.freeSpinIndex = 0;
    this.featureWin = 0;
    this.autoplayRemaining = 0;
    this.setBoardCameraExpanded(false, true);
    this.girder.startFeatureIdle();
    this.setBackground(true);
    this.layout();
    this.audio.play("feature");
    // Original Freegame.CreditMeterIntro: the credit meter transition out of
    // the base game sounds as the feature entry sequence begins.
    this.audio.play("creditMeterIntro", 0.4);
    this.audio.startFreeMusic();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const smoke = this.playFrameEffect("fsBlast", "smoke", w / 2, h * 0.5, Math.min(w, 1e3), h * 0.75);
    await new Promise((resolve) => {
      smoke.onComplete = () => {
        smoke.destroy();
        resolve();
      };
    });
    const wind = this.playFrameEffect("wind", "wind", w / 2, h * 0.45, Math.min(w, 1100), h * 0.7, true);
    await this.showFeatureIntroTally(kind);
    wind.destroy();
    // The tally introduces Free Spins before any triggering frame appears.
    // Only then construct the entry frames, one upgrade step at a time.
    if (entryResult) {
      await this.applyHats(entryResult, entryAssets, true);
      this.lastResultSuppressedFrames = false;
      this.showPersistentFrames();
    }
    this.freeSpins--;
    this.freeSpinIndex++;
    await this.performSpin(true, false);
  }
  async endFeature() {
    this.state = "featureEnd";
    this.updateControls();
    // Free Spins music continues beneath the wolf and the final tally.
    await Promise.all([
      this.spines.ensure(["wolf", "houses", "coin", "tally"]),
      ensureAtlases(this.atlases, ["windBricks", "fsBlast"])
    ]);
    const positions = [];
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = ROWS - this.activeRows; row < ROWS; row++) {
        if (this.frames[reel][row] > 0) positions.push({ reel, row });
      }
    }
    positions.sort((a, b) => a.reel - b.reel);
    positions.sort((a, b) => this.frames[a.reel][a.row] - this.frames[b.reel][b.row]);
    const featureEnd = await this.platform.featureEnd({
      bet: this.bet,
      frames: this.frames.map((column) => [...column]),
      activeRows: this.activeRows,
      seed: this.baseSeed + ++this.spinCounter * 7919 >>> 0
    });
    const awardAt = (position) => featureEnd.awards.find((award) => award.position.reel === position.reel && award.position.row === position.row);
    const dim = new ColorMatrixFilter();
    dim.brightness(0.35);
    this.reels.window.filters = [dim];
    for (const position of positions) await this.playHouseAnimation(position, this.frames[position.reel][position.row]);
    await exactWait(800);
    const parentUnit = this.board.width / (523 * 2);
    const landscape = this.app.screen.height / this.app.screen.width <= 1.18;
    // Fixed landscape children use the original 1920×1920 design root. It is
    // scaled from the screen width and centred vertically, which is why the
    // apparently large source y coordinates land beside the reels on screen.
    const designUnit = landscape ? this.app.screen.width / 1920 : Math.min(this.app.screen.width / 1920, this.app.screen.height / 1080);
    const designOffsetY = landscape ? (this.app.screen.height - 1920 * designUnit) / 2 : 0;
    const designPoint = (x, y) => ({ x: x * designUnit, y: designOffsetY + y * designUnit });
    const wolf = this.spines.create("wolf");
    wolf.scale.set(0.9 * (landscape ? designUnit : parentUnit));
    // Original WolfFeature settings: landscape (1700,1387), portrait (5,-590)
    // relative to the reel centre.
    const wolfPoint = landscape ? designPoint(1700, 1387) : {
      x: this.board.x + this.board.width / 2 + 5 * parentUnit,
      y: this.board.y + this.board.height / 2 - 590 * parentUnit
    };
    wolf.position.set(wolfPoint.x, wolfPoint.y);
    wolf.label = "WolfFeatureCharacter";
    this.characterLayer.addChild(wolf);
    // Keep the arrival cue, but do not replace the Free Spins background with
    // a different track during the feature finale.
    const wolfIntro = this.audio.play("wolfJumpDownComplete", 0.3);
    const wolfWindLine = this.spines.create("wolf");
    // Original eQ applies the same QE scale and PE origin to the wolf and its
    // Wind_blow_line Spine; only the wind-line visibility differs.
    wolfWindLine.scale.copyFrom(wolf.scale);
    wolfWindLine.position.copyFrom(wolf.position);
    wolfWindLine.visible = false;
    wolfWindLine.label = "WolfFeatureWindLine";
    this.characterLayer.addChild(wolfWindLine);
    const updateWolfDebug = (stage) => {
      window.__WOLF_DEBUG__ = {
        stage,
        active: true,
        wolfParent: wolf.parent?.label || null,
        windParent: wolfWindLine.parent?.label || null,
        characterStageIndex: this.app.stage.getChildIndex(this.characterLayer),
        footerStageIndex: this.app.stage.getChildIndex(this.uiLayer),
        behindFooter: this.app.stage.getChildIndex(this.characterLayer) < this.app.stage.getChildIndex(this.uiLayer),
        wolfBounds: wolf.getBounds(),
        footerBounds: this.bottomBar.getBounds()
      };
    };
    // Original arrival: W_blowa once, then the half-speed W_blowh hold loop.
    window.__WOLF_STAGE__ = "arrival";
    updateWolfDebug("arrival");
    await this.spines.playWithOptions(wolf, "W_blowa");
    window.__WOLF_STAGE__ = "hold";
    this.spines.playWithOptions(wolf, "W_blowh", { loop: true, speed: 0.5 });
    updateWolfDebug("hold");
    for (let frame = 1; frame <= 3; frame++) {
      const group = positions.filter((position) => this.frames[position.reel][position.row] === frame);
      if (!group.length) continue;
      this.audio.play(frame === 1 ? "wolfStraw" : frame === 2 ? "wolfStick" : "wolfBrick", 0.35);
      window.__WOLF_STAGE__ = `blow-${frame}-in`;
      await this.spines.playWithOptions(wolf, "W_blow_In", { speed: 0.7 });
      await this.spines.playWithOptions(wolf, "W_blowb");
      window.__WOLF_STAGE__ = `blow-${frame}`;
      wolfWindLine.visible = true;
      this.spines.playWithOptions(wolfWindLine, "Wind_blow_line");
      void this.spines.playWithOptions(wolf, "W_blowc").then(() => {
        this.spines.playWithOptions(wolf, "W_blowd");
        wolfWindLine.visible = false;
      });
      await exactWait(1000);
      const windPoint = landscape ? designPoint(960, 1100) : { x: wolf.x, y: wolf.y };
      const windTexture = this.atlases.windBricks.texture("wolf_wind_bricks");
      const windScale = landscape ? (ASSET_DEVICE === "desktop" ? 4 : 2) * designUnit : 0;
      const wolfWind = this.playFrameEffect(
        "windBricks",
        "wolf_wind_bricks",
        windPoint.x,
        windPoint.y,
        landscape ? windTexture.width * windScale : this.board.width * 1.05,
        landscape ? windTexture.height * windScale : this.board.height * 1.05,
        true
      );
      await exactWait(frame === 1 ? 200 : 1000);
      for (const position of group) {
        const award = awardAt(position);
        if (!award) throw new Error("Missing supplied house award");
        await this.playHouseOut(position, frame);
        await this.platform.credit(award.amount);
        this.featureWin = Math.round((this.featureWin + award.amount) * 100) / 100;
        this.win = award.amount;
        this.updateMeters();
        if (award.jackpot) {
          if (!this.firstJackpotBlast) {
            this.firstJackpotBlast = true;
            this.playFrameEffect("fsBlast", "smoke", this.app.screen.width / 2, this.app.screen.height / 2, Math.min(this.app.screen.width, 1000), this.app.screen.height * 0.75);
          }
          void this.playJackpotAnimation(position, award);
        } else void this.showCreditAward(position, frame, award.amount);
      }
      wolfWind.destroy();
      this.spines.playWithOptions(wolf, "W_blowh", { loop: true, speed: 0.5 });
      await exactWait(1000);
    }
    // Resolution sting as the wolf walks off before the final tally.
    window.__WOLF_STAGE__ = "exit";
    this.audio.play("wolfResolution", 0.4);
    await this.spines.playWithOptions(wolf, "W_blowe");
    await this.spines.playWithOptions(wolf, "W_blowf");
    await this.spines.playWithOptions(wolf, "W_blowg_play_reverse");
    await this.spines.playWithOptions(wolf, "W_blowi");
    this.reels.window.filters = null;
    this.audio.stop(wolfIntro);
    await this.showFeatureTally();
    // The feature background ends only after its end screen has completed.
    this.audio.stopMusic();
    if (!wolf.destroyed) wolf.visible = false;
    if (this.featureWin >= this.bet * 25) await this.showNativeBigWin(this.featureWin);
    this.spines.release(wolf);
    this.spines.release(wolfWindLine);
    window.__WOLF_DEBUG__ = { stage: "idle", active: false, wolfParent: null, windParent: null, behindFooter: true };
    for (const object of this.featureObjects) {
      if (object.skeleton && this.spines.instances.has(object)) this.spines.release(object);
      else if (!object.destroyed) object.destroy({ children: true });
    }
    this.featureObjects = [];
    this.houseAnimations.clear();
    this.firstJackpotBlast = false;
    for (const frame of this.frameAnimations) this.spines.release(frame.object);
    this.frameAnimations = [];
    this.clearSymbolOverlays();
    this.frames = emptyFrames();
    this.lastResultSuppressedFrames = true;
    this.reels.clearHouses();
    this.reels.clearWinners();
    this.mode = "base";
    this.activeRows = 3;
    this.win = this.featureWin;
    this.setBackground(false);
    this.setBoardCameraExpanded(false, true);
    this.layout();
    await this.girder.restoreBase();
    this.showPersistentFrames();
    this.state = "idle";
    this.updateMeters();
    this.updateControls();
  }
  setBackground(free) {
    const atlas = free ? this.atlases.freeBackgroundNew : this.atlases.baseBackgroundNew;
    // The looping Spine is the complete base-game backdrop. Leaving it above
    // the feature sky creates a blue seam at the edge of its fixed bounds.
    this.backgroundAnim.visible = !free;
    this.sky.texture = atlas.texture(free ? "Freespin_sky" : "basegame_bkg_sky");
    this.skyline.texture = atlas.texture(free ? "Freespin_bkg_top" : "basegame_bkg_top");
    this.clouds.forEach((cloud, i) => {
      cloud.texture = atlas.texture(free ? `FS_cloud_${["A", "B", "C"][i]}` : `cloud_${["A", "B", "C"][i]}`);
    });
    const setSourceTexture = (sprite, texture) => {
      sprite.texture = texture;
      sprite.anchor.set(texture.sourceAnchor.x, texture.sourceAnchor.y);
    };
    setSourceTexture(this.sourceSky, atlas.texture(free ? "Freespin_sky" : "basegame_bkg_sky"));
    setSourceTexture(this.sourceSkyline, atlas.texture(free ? "Freespin_bkg_top" : "basegame_bkg_top"));
    this.sourceClouds.forEach((cloud, i) => {
      setSourceTexture(cloud, atlas.texture(free ? `FS_cloud_${["A", "B", "C"][i]}` : `cloud_${["A", "B", "C"][i]}`));
    });
    // Original lh()/y8a() reconstructs and restarts these paths on a mode
    // change. Retain the objects but reproduce the same timing boundary.
    this.sourceBackgroundElapsed = 0;
    this.sourceBirds.forEach((bird) => bird.gotoAndPlay(0));
    this.updateSourceBackground(0);
  }
  async wait(ms) {
    const duration = this.quickStop ? Math.min(ms, 70) : this.turbo ? ms * 0.45 : ms;
    await new Promise((resolve) => {
      let elapsed = 0;
      let previous = 0;
      const step = (now) => {
        if (this.disposed) {
          resolve();
          return;
        }
        if (!previous) previous = now;
        if (!this.paused) elapsed += now - previous;
        previous = now;
        if (elapsed >= duration) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  async showBanner(message, duration) {
    this.bannerText.text = message;
    this.banner.visible = true;
    this.banner.alpha = 1;
    await this.wait(duration);
    this.banner.visible = false;
  }
  waitForTap(timeout = 0) {
    return new Promise((resolve) => {
      let done = false;
      let timer = 0;
      const finish = () => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        this.app.stage.off("pointerdown", finish);
        resolve();
      };
      if (timeout > 0) timer = setTimeout(finish, timeout);
      this.app.stage.on("pointerdown", finish);
    });
  }
  async showFeatureIntroTally(kind) {
    window.__FEATURE_TALLY_READY__ = false;
    await this.spines.ensure(["tally"]);
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const portrait = h / w > 1.18;
    const name = portrait ? "transition_portrait" : "transition_landscape";
    const unit = portrait ? Math.min(w / 1080, h / 1920) : w / 1920;
    const shade = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.7 });
    shade.alpha = 0;
    const tally = this.spines.create("tally", name, false);
    tally.label = "OriginalFullscreenTally";
    tally.pivot.set(0);
    tally.scale.set(unit);
    tally.position.set(w / 2, h / 2);
    tally.alpha = 0;
    const upperPanel = tally.skeleton.findBone("tape_long");
    const lowerPanel = tally.skeleton.findBone("tape_short");
    if (!upperPanel || !lowerPanel) throw new Error("Tally panel bones are unavailable");

    // KWa/YVa live in the centred tally container. Their label scale and
    // offsets are independent of the Spine's desktop design-unit scale.
    const content = new Container();
    content.label = "OriginalTallyTextContainer";
    content.position.set(w / 2, h / 2);
    content.scale.set(unit / 1.4);
    content.alpha = 0;
    const number = label("6", 250, 16768896);
    number.label = "FsNumberText";
    number.anchor.set(0.5);
    number.scale.set(1.4);
    // The content container is 1.4 times smaller than the Spine coordinate
    // system. Following the settled panel bone also applies the portrait
    // animation's vertical shift instead of leaving the text at desktop offsets.
    number.position.set(upperPanel.worldX * 1.4, upperPanel.worldY * 1.4);
    number.style.fontFamily = "Game Noto Sans";
    number.style.fontWeight = "900";
    number.style.fill = verticalGradient([[0, 0xfffebf], [0.7, 0xfdf27c], [1, 0xebc65a]]);
    number.style.stroke = { color: 0x050507, width: 7 };
    const awarded = label("FREE SPINS\nAWARDED", 128, 1513225);
    awarded.label = "BonusAwardText";
    awarded.anchor.set(0.5);
    awarded.position.set(lowerPanel.worldX * 1.4, lowerPanel.worldY * 1.4);
    // The original 0.8 multiplier applies to the SDF font's line metrics,
    // rather than directly to the 128-point font size.
    awarded.style = new TextStyle({ fontFamily: "Game Noto Sans", fontSize: 128, fontWeight: "900", fill: 1513225, align: "center", lineHeight: 142.64 });
    content.addChild(number, awarded);
    let superText = null;
    if (kind === "super") {
      superText = label("SUPER SAW", 120, 16777215);
      superText.label = "SuperSawText";
      superText.anchor.set(0.5);
      // Keep the additional caption between the two measured labels. This is
      // especially important in portrait, where the upper panel moves down.
      const numberBottom = number.y + number.height / 2;
      const awardedTop = awarded.y - awarded.height / 2;
      superText.position.set(awarded.x, (numberBottom + awardedTop) / 2);
      content.addChild(superText);
    }

    const press = new Container();
    press.label = "ClickToStart";
    press.scale.set(0.85 * unit);
    press.alpha = 0;
    press.visible = false;
    press.eventMode = "static";
    press.cursor = "pointer";
    const pressBg = new Sprite(this.atlases.clickStart.texture("btn_clicktostart_base"));
    pressBg.anchor.set(0.5);
    pressBg.scale.set(2);
    // The visible lower tape extends 128 bone-local units below its centre.
    // Leave a clear 60-unit gap even at the button's largest pulse scale.
    const lowerPanelHalfHeight = 128 * Math.hypot(lowerPanel.c, lowerPanel.d);
    const pressGap = 60 * unit;
    const pressMaxHalfHeight = pressBg.height / 2;
    press.position.set(
      w / 2,
      tally.y + (lowerPanel.worldY + lowerPanelHalfHeight + pressMaxHalfHeight) * unit + pressGap
    );
    const pressText = label("PRESS TO START", 80, 2765580);
    pressText.label = "PressToStartText";
    pressText.anchor.set(0.5);
    pressText.style = new TextStyle({ fontFamily: "Game Noto Sans", fontSize: 80, fontWeight: "700", fill: 2765580 });
    // Original PressToStart setting: fontSize 80 within a 490-unit label.
    // Noto Sans's browser advance is wider than the supplied SDF reference;
    // uniform fitting preserves the reference glyph height and line weight.
    pressText.scale.set(Math.min(1, 460 / pressText.width));
    press.addChild(pressBg, pressText);
    this.effects.addChild(shade, tally, content, press);

    this.audio.play(kind === "super" ? "superBanner" : "featureBanner", 0.4);
    if (kind !== "super") this.audio.play("featureWaitIntro", 0.35);
    const waitMusic = this.audio.playLoop(kind === "super" ? "superWaitMusic" : "featureWaitMusic", 0.25);
    await exactTween(500, (t) => {
      shade.alpha = t;
      tally.alpha = t;
    });
    await exactWait(650);
    this.audio.play("hardhatsReveal", 0.4);
    await exactTween(500, (t) => { content.alpha = t; });
    await exactWait(600);
    press.visible = true;
    press.alpha = 1;
    let pulseActive = true;
    const pulse = async () => {
      while (pulseActive && !press.destroyed) {
        await exactTween(1000, (t) => { if (!press.destroyed) press.scale.set((0.85 + 0.15 * t) * unit); });
        if (!pulseActive || press.destroyed) break;
        await exactTween(1000, (t) => { if (!press.destroyed) press.scale.set((1 - 0.15 * t) * unit); });
      }
    };
    void pulse();
    const screenBounds = (object) => {
      const bounds = object.getLocalBounds();
      const points = [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x, y: bounds.y + bounds.height },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
      ].map((point) => object.worldTransform.apply(point));
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    };
    window.__FEATURE_TALLY_DEBUG__ = {
      text: awarded.text,
      orientation: portrait ? "portrait" : "landscape",
      numberBounds: screenBounds(number),
      awardedBounds: screenBounds(awarded),
      superTextBounds: superText ? screenBounds(superText) : null,
      numberPanelCenter: { x: tally.x + upperPanel.worldX * unit, y: tally.y + upperPanel.worldY * unit },
      awardedPanelCenter: { x: tally.x + lowerPanel.worldX * unit, y: tally.y + lowerPanel.worldY * unit },
      lowerPanelBottom: tally.y + (lowerPanel.worldY + lowerPanelHalfHeight) * unit,
      tallyBounds: screenBounds(tally),
      pressBounds: screenBounds(press),
      pressBackgroundBounds: screenBounds(pressBg),
      pressMaximumBackgroundBounds: {
        x: press.x - pressBg.width * unit / 2,
        y: press.y - pressMaxHalfHeight * unit,
        width: pressBg.width * unit,
        height: pressBg.height * unit
      },
      pressGap,
      pressTextBounds: screenBounds(pressText),
      tallyScale: tally.scale.x,
      textScale: content.scale.x,
      pressCenter: { x: press.x, y: press.y },
      viewport: { width: w, height: h }
    };
    window.__FEATURE_TALLY_READY__ = true;
    await new Promise((resolve) => press.once("pointertap", resolve));
    pulseActive = false;
    window.__FEATURE_TALLY_READY__ = false;
    this.audio.stop(waitMusic);
    await exactTween(500, (t) => {
      tally.alpha = 1 - t;
      content.alpha = 1 - t;
      press.alpha = 1 - t;
      shade.alpha = 1 - t;
    });
    content.destroy({ children: true });
    press.destroy({ children: true });
    shade.destroy();
    this.spines.release(tally);
  }
  playFrameEffect(atlas, animation, x, y, width, height, loop = false) {
    const source = this.atlases[atlas];
    const sprite = new AnimatedSprite(source.animation(animation));
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.width = width;
    sprite.height = height;
    sprite.animationSpeed = source.fps / 60;
    sprite.loop = loop;
    this.effects.addChild(sprite);
    if (!loop) sprite.onComplete = () => sprite.destroy();
    sprite.play();
    return sprite;
  }
  async showNativeBigWin(amount) {
    await Promise.all([
      this.spines.ensure(["bigwinSmoke"]),
      ensureAtlases(this.atlases, ["bigwinAssets", "centerParticles", "fireworks", "numberGlow", "newBigwinParticles"])
    ]);
    // Original RS.GDM.ba thresholds and tier durations. The full Big Win
    // presentation starts at T4 (25×); lower tiers use separate countups.
    const tiers = [
      { threshold: 100, tier: 7, count: 9320, total: 9320, titleY: 0.41, titleWidth: 1700, firework: "firework_yellow" },
      { threshold: 75, tier: 6, count: 9280, total: 9280, titleY: 0.4, titleWidth: 1700, firework: "blue_firework" },
      { threshold: 50, tier: 5, count: 6400, total: 8000, titleY: 0.415, titleWidth: 1700, firework: "green_firework" },
      { threshold: 25, tier: 4, count: 5500, total: 7000, titleY: 0.415, titleWidth: 1000, firework: "red_firework" }
    ];
    const wager = amount / this.bet;
    const selected = tiers.find((entry) => wager >= entry.threshold) || tiers[tiers.length - 1];
    const openingTier = tiers[tiers.length - 1];
    let activeTier = openingTier;
    let bigwinTier = openingTier.tier;
    let bigwinAudio = null;
    const playBigwinTier = (tier) => {
      if (bigwinAudio) this.audio.stop(bigwinAudio);
      bigwinTier = tier;
      bigwinAudio = this.audio.play(`bigwin${tier}`, 0.5);
    };
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const unit = Math.min(w / 1920, h / 1080);
    const portrait = this.isPortraitLayout();
    const environmentUnit = portrait ? Math.min(w / 1080, h / 1920) : unit;
    const root = new Container();
    root.label = "SourceBigWinPresentation";
    const shade = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.8 });
    shade.label = "BW_background";
    root.addChild(shade);
    // House/frame Spines also live in effects; this foreground root is last.
    this.effects.addChild(root);
    root.alpha = 0;
    const spineObjects = [];
    const rays = new Sprite(this.atlases.bigwinAssets.texture("rays"));
    rays.label = "CenterGlow";
    rays.anchor.set(0.5);
    rays.scale.set(unit);
    rays.position.set(w / 2, h * 0.41);
    root.addChild(rays);
    const addEnvironment = (animation, sourceScale, x, y, mirror = false) => {
      const object = this.spines.create("bigwinSmoke", animation, false);
      // Original Garden/Bushes use their unmodified Spine origin. Re-fitting
      // them around a centre pivot made the ground and trees float.
      object.pivot.set(0);
      object.scale.set(sourceScale * environmentUnit * (mirror ? -1 : 1), sourceScale * environmentUnit);
      object.position.set(x, y);
      object.label = animation === "trees" ? (mirror ? "BushesRight" : "BushesLeft") : "Garden";
      root.addChild(object);
      spineObjects.push(object);
      return object;
    };
    // Original mb (landscape) and nb (portrait) environment placements.
    addEnvironment("trees", 1.3, w * 0.17 - (portrait ? 270 : 240) * environmentUnit, h - 165 * environmentUnit);
    addEnvironment("trees", portrait ? 0.8 : 1, portrait ? w * 0.83 + 120 * environmentUnit : w * 0.85 + 280 * environmentUnit, h - (portrait ? 165 : 131) * environmentUnit, true);
    // Garden is mirrored in the supplied state; portrait uses its nb y=-10.
    addEnvironment("ground_gate", portrait ? 1 : 1.01, w / 2, h + (portrait ? -10 : 50) * environmentUnit, true);
    const fireworks = [
      [activeTier.firework, 0.3, 0.4, 1.4],
      [activeTier.firework, 0.9, 0.4, 1.4],
      [activeTier.firework, 0.3, 0.7, 1.2],
      [activeTier.firework, 0.86, 0.7, 1.2]
    ].map(([animation, x, y, sourceScale]) => {
      const sprite = new AnimatedSprite(this.atlases.fireworks.animation(animation));
      sprite.label = `BigWinFirework:${animation}`;
      sprite.anchor.set(0.5);
      sprite.position.set(w * x, h * y);
      sprite.scale.set(sourceScale * unit);
      sprite.animationSpeed = this.atlases.fireworks.fps / 60;
      sprite.blendMode = "add";
      sprite.loop = true;
      root.addChild(sprite);
      sprite.play();
      return sprite;
    });
    const particleName = activeTier.tier >= 7 ? "particle_d" : activeTier.tier === 6 ? "particle_c" : activeTier.tier === 5 ? "particle_b" : "particle_a";
    const coins = Array.from({ length: 22 }, (_, index) => {
      const coin = new Sprite(this.atlases.newBigwinParticles.texture(particleName));
      coin.anchor.set(0.5);
      const size = Math.max(22, Math.min(54, w * 0.065)) * (0.78 + index % 4 * 0.08);
      coin.width = size;
      coin.scale.y = coin.scale.x;
      root.addChild(coin);
      return {
        object: coin,
        startX: (index + 0.5) / 22 * w,
        drift: (index % 7 - 3) * w * 0.012,
        phase: index * 0.173 % 1,
        speed: 0.36 + index % 5 * 0.035,
        rise: h * (0.32 + index % 4 * 0.045),
        rotation: (index % 2 ? 1 : -1) * (1.4 + index % 3 * 0.4)
      };
    });
    const text = (value, size, y, style, name) => {
      const object = label(value, size);
      object.label = name;
      object.anchor.set(0.5);
      object.position.set(w / 2, y);
      object.style = new TextStyle(style);
      root.addChild(object);
      return object;
    };
    const tierText = text("HUGE WIN!", 260 * unit, h * activeTier.titleY, {
      fontFamily: "Game Noto Sans",
      fontSize: 260 * unit,
      fontWeight: "700",
      fill: verticalGradient([[0, 0xffec14], [0.51, 0xffec14], [0.69, 0xee5515], [0.81, 0xff4e00], [1, 0xff4e00]]),
      align: "center",
      stroke: { color: 0x350260, width: 24 * unit },
      dropShadow: { color: 0x1d012f, blur: 2 * unit, distance: 7 * unit }
    }, "BigWinTierText");
    const amountText = text(money(0), 240 * unit, h * 0.5 + 255 * unit, {
      fontFamily: "Game Noto Sans",
      fontSize: 240 * unit,
      fontWeight: "700",
      fill: verticalGradient([[0, 0x9dd6f7], [0.03, 0x9dd6f7], [0.41, 0xd6ecf4], [0.68, 0x59b2e5], [1, 0x59b2e5]]),
      align: "center",
      stroke: { color: 0x570000, width: 12.5 * unit },
      dropShadow: { color: 0x4d0201, blur: 1.5 * unit, distance: 5 * unit }
    }, "BigWinCountupLabel");
    const fitBigWinText = (introScale = 1) => {
      tierText.scale.set(1);
      const tierWidth = activeTier.titleWidth * unit;
      const tierFit = tierText.width > tierWidth ? tierWidth / tierText.width : 1;
      tierText.scale.set(tierFit * introScale);
      tierText.position.y = h * activeTier.titleY;
      amountText.scale.set(1);
      const amountWidth = 900 * unit;
      if (amountText.width > amountWidth) amountText.scale.set(amountWidth / amountText.width);
    };
    fitBigWinText();
    const bigwinBounds = (object) => {
      const bounds = object.getBounds();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    };
    window.__BIGWIN_STAGE__ = "intro";
    window.__BIGWIN_DEBUG__ = {
      stage: "intro",
      tier: openingTier.tier,
      finalTier: selected.tier,
      sound: `bigwin${openingTier.tier}`,
      sourceThreshold: openingTier.threshold,
      finalThreshold: selected.threshold,
      tierTitle: tierText.text,
      multiplierVisible: false,
      tierHistory: [],
      finalAmount: amount,
      displayedAmount: 0,
      displayedMultiplier: 0,
      foreground: this.effects.children.at(-1) === root,
      housesBehind: this.featureObjects.filter((object) => !object.destroyed && object.parent === this.effects).every((object) => this.effects.getChildIndex(object) < this.effects.getChildIndex(root)),
      rootLabel: root.label,
      tierTextBounds: bigwinBounds(tierText),
      amountTextBounds: bigwinBounds(amountText),
      viewport: { width: w, height: h },
      sourceLayout: { titleY: activeTier.titleY, amountOffsetY: 255, titleWidth: activeTier.titleWidth, amountWidth: 900 }
    };
    this.audio.stopSfx();
    playBigwinTier(openingTier.tier);
    try {
      await exactTween(300, (t) => { root.alpha = t; });
      const sequence = tiers.filter((tier) => tier.tier >= openingTier.tier && tier.tier <= selected.tier).reverse();
      let presentationElapsed = 0;
      for (let sequenceIndex = 0; sequenceIndex < sequence.length; sequenceIndex++) {
        activeTier = sequence[sequenceIndex];
        if (bigwinTier !== activeTier.tier) playBigwinTier(activeTier.tier);
        window.__BIGWIN_DEBUG__.tierHistory.push({ tier: activeTier.tier, sound: `bigwin${activeTier.tier}`, total: activeTier.total, count: activeTier.count });
        const nextTier = sequence[sequenceIndex + 1];
        const startMultiplier = activeTier.tier === openingTier.tier ? 0 : activeTier.threshold;
        const targetMultiplier = nextTier ? nextTier.threshold : wager;
        const countDuration = Math.min(activeTier.count, Math.max(0, activeTier.total - 1000));
        const particle = activeTier.tier >= 7 ? "particle_d" : activeTier.tier === 6 ? "particle_c" : activeTier.tier === 5 ? "particle_b" : "particle_a";
        for (const sprite of fireworks) {
          sprite.textures = this.atlases.fireworks.animation(activeTier.firework);
          sprite.gotoAndPlay(0);
        }
        for (const coin of coins) coin.object.texture = this.atlases.newBigwinParticles.texture(particle);
        await exactTween(activeTier.total, (t) => {
          const elapsed = t * activeTier.total;
          const progress = countDuration > 0 ? Math.min(1, elapsed / countDuration) : 1;
          const currentMultiplierValue = startMultiplier + (targetMultiplier - startMultiplier) * progress;
          const current = currentMultiplierValue * this.bet;
          const currentMultiplier = Math.floor((current + 1e-8) / this.bet);
          amountText.text = money(current);
          fitBigWinText(Math.min(1, elapsed / 500));
          const stage = progress < 1 ? "countup" : "hold";
          window.__BIGWIN_STAGE__ = stage;
          Object.assign(window.__BIGWIN_DEBUG__, {
            stage,
            tier: activeTier.tier,
            finalTier: selected.tier,
            sound: `bigwin${bigwinTier}`,
            sourceThreshold: activeTier.threshold,
            displayedAmount: Math.round(current * 100) / 100,
            displayedMultiplier: currentMultiplier,
            tierTextBounds: bigwinBounds(tierText),
            amountTextBounds: bigwinBounds(amountText),
            sourceLayout: { titleY: activeTier.titleY, amountOffsetY: 255, titleWidth: activeTier.titleWidth, amountWidth: 900 }
          });
          rays.rotation = (presentationElapsed + elapsed) / 20000 * Math.PI * 2;
          for (const coin of coins) {
            const globalElapsed = presentationElapsed + elapsed;
            const p = (globalElapsed / 1000 * coin.speed + coin.phase) % 1;
            coin.object.position.set(coin.startX + coin.drift * p, h + 50 - coin.rise * Math.sin(p * Math.PI));
            coin.object.rotation = globalElapsed / 1000 * coin.rotation;
            coin.object.alpha = Math.min(1, p * 8, (1 - p) * 8);
          }
        });
        presentationElapsed += activeTier.total;
      }
      amountText.text = money(amount);
      fitBigWinText();
      window.__BIGWIN_STAGE__ = "ending";
      window.__BIGWIN_DEBUG__.stage = "ending";
      window.__BIGWIN_DEBUG__.displayedAmount = amount;
      window.__BIGWIN_DEBUG__.displayedMultiplier = Math.floor((amount + 1e-8) / this.bet);
      window.__BIGWIN_DEBUG__.tierTextBounds = bigwinBounds(tierText);
      window.__BIGWIN_DEBUG__.amountTextBounds = bigwinBounds(amountText);
      await exactTween(500, (t) => { root.alpha = 1 - t; });
    } finally {
      this.audio.stopSfx();
      for (const object of spineObjects) {
        if (this.spines.instances.has(object)) this.spines.release(object);
      }
      for (const sprite of fireworks) sprite.stop();
      root.destroy({ children: true });
      window.__BIGWIN_STAGE__ = "idle";
      if (window.__BIGWIN_DEBUG__) window.__BIGWIN_DEBUG__.stage = "idle";
    }
  }
  async playHouseAnimation(position, frame) {
    const animationName = frame === 1 ? "Straw_house_in" : frame === 2 ? "Wood_house_in" : "Brick_house_in";
    const house = this.spines.create("houses");
    const point = this.reels.positionOf(position);
    const unit = this.girder.unit;
    house.scale.set(unit);
    house.position.set(point.x - (frame === 2 ? 2 * unit : 0), point.y);
    house.label = `OriginalHouseIn:${animationName}`;
    this.effects.addChild(house);
    this.featureObjects.push(house);
    this.houseAnimations.set(`${position.reel}:${position.row}`, house);
    this.spines.playWithOptions(house, animationName);
    this.audio.play(frame === 1 ? "houseStraw" : frame === 2 ? "houseStick" : "houseBrick", 0.3);
    await exactWait(300);
    this.reels.setCellVisible(position, false);
    this.reels.frames[position.reel][position.row].visible = false;
    const frameAnimation = this.frameAnimations.find((item) => item.position.reel === position.reel && item.position.row === position.row);
    if (frameAnimation) frameAnimation.object.visible = false;
  }
  async playHouseOut(position, frame) {
    const animationName = frame === 1 ? "Straw_house_out" : frame === 2 ? "Wood_house_out" : "Brick_house_out";
    const previous = this.houseAnimations.get(`${position.reel}:${position.row}`);
    if (previous) previous.visible = false;
    const house = this.spines.create("houses");
    const point = this.reels.positionOf(position);
    const unit = this.girder.unit;
    house.scale.set(unit);
    house.scale.x *= 0.93;
    house.position.set(point.x, point.y);
    house.label = `OriginalHouseOut:${animationName}`;
    this.effects.addChild(house);
    this.featureObjects.push(house);
    this.houseAnimations.set(`${position.reel}:${position.row}`, house);
    this.spines.playWithOptions(house, animationName);
    // House blown away: straw/stick credit reveal, brick bonus reveal.
    this.audio.play(frame === 1 ? "blowStraw" : frame === 2 ? "blowStick" : "blowBrick", 0.4);
    await exactWait(300);
  }
  async showCreditAward(position, frame, amount) {
    // Per-house credit reveal sound keyed by the house level.
    this.audio.play(frame === 1 ? "houseCreditStraw" : frame === 2 ? "houseCreditStick" : "houseCreditBrick", 0.35);
    await exactWait(300);
    const point = this.reels.positionOf(position);
    const unit = this.girder.unit;
    const colors = { 1: 0x63c7ff, 2: 0xff7ab8, 3: 0xffc62e };
    const credit = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const awardLabel = label(credit, 44 * unit, colors[frame] ?? 0xffffff);
    awardLabel.label = `HouseCredit:${frame}`;
    awardLabel.anchor.set(0.5);
    awardLabel.position.set(point.x, point.y);
    awardLabel.style.fontFamily = "Game Noto Sans";
    awardLabel.style.fontWeight = "900";
    awardLabel.style.stroke = { color: 0x08152f, width: Math.max(2, 5 * unit) };
    awardLabel.style.dropShadow = { color: 0, blur: 2 * unit, distance: 2 * unit, alpha: 0.75 };
    // Keep unusually large awards inside their own cell without reducing the
    // reference-sized ordinary credit labels.
    const maxWidth = this.reels.columns[position.reel].cellW * 0.92;
    if (awardLabel.width > maxWidth) awardLabel.scale.set(maxWidth / awardLabel.width);
    awardLabel.alpha = 0;
    this.effects.addChild(awardLabel);
    this.featureObjects.push(awardLabel);
    await exactTween(200, (t) => { awardLabel.alpha = t; });
  }
  async playJackpotAnimation(position, award) {
    this.audio.play("jackpotLand", 0.4);
    const jackpot = award.jackpot;
    const name = jackpot.toLowerCase().includes("grand") ? "jackpot_grand" : jackpot.toLowerCase().includes("major") ? "jackpot_major" : jackpot.toLowerCase().includes("minor") ? "jackpot_minor" : "jackpot_mini";
    const animation = this.spines.create("coin");
    const point = this.reels.positionOf(position);
    const unit = this.girder.unit;
    animation.scale.set(0.65 * unit);
    animation.position.set(point.x, point.y);
    animation.label = "Jackpot award intro";
    this.effects.addChild(animation);
    this.featureObjects.push(animation);
    this.spines.playWithOptions(animation, name);
    await exactWait(2200);
    const doubleMini = jackpot.toUpperCase().includes("X2");
    const tier = doubleMini ? "MINI" : jackpot.toUpperCase();
    const tierColor = JACKPOT_TEXT_COLORS[tier] ?? 0xffffff;
    const prizeName = label(doubleMini ? "MINI" : jackpot, 28 * unit, tierColor);
    const prizeAmount = label(money(award.amount), 20 * unit, tierColor);
    const multiplier = label(doubleMini ? "x2" : "", 28 * unit, tierColor);
    prizeName.anchor.set(0.5);
    prizeAmount.anchor.set(0.5);
    multiplier.anchor.set(0.5);
    const labels = doubleMini ? [prizeName, prizeAmount, multiplier] : [prizeName, prizeAmount];
    for (const item of labels) item.style.stroke = { color: 0x351500, width: Math.max(1, 2 * unit) };
    // Centre the whole label stack on the coin. Measuring the actual outlined
    // text heights also keeps the three-line MINI X2 award inside the coin.
    const labelGap = 2 * unit;
    const labelsHeight = labels.reduce((total, item) => total + item.height, 0) + labelGap * (labels.length - 1);
    let labelY = point.y - labelsHeight / 2;
    for (const item of labels) {
      item.position.set(point.x, labelY + item.height / 2);
      labelY += item.height + labelGap;
    }
    this.effects.addChild(...labels);
    this.featureObjects.push(...labels);
    for (const item of labels) item.scale.set(0);
    for (const item of labels) {
      void exactTween(400, (t) => item.scale.set(1.1 * t)).then(() => exactTween(200, (t) => item.scale.set(1.1 - 0.1 * t)));
    }
    await exactWait(300);
  }
  async showFeatureTally() {
    window.__FEATURE_FINAL_TALLY__ = true;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const shade = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.68 });
    const content = new Container();
    content.position.set(w / 2, h * 0.45);
    content.scale.set(Math.min(1, w / 650));
    const congratulations = label("CONGRATULATIONS!\nYOU WON", 54, 16777215);
    congratulations.anchor.set(0.5);
    congratulations.position.set(0, -120);
    congratulations.style = new TextStyle({ fontFamily: "Arial Black, Arial", fontSize: 54, fontWeight: "900", fill: verticalGradient([[0.38, 0xffde00], [0.74, 0xd02800], [0.93, 0xeba900]]), align: "center", lineHeight: 68, stroke: { color: 16777215, width: 5 }, dropShadow: { color: 0x260000, blur: 2, distance: 3 } });
    const amount = label(money(this.featureWin), 112, 16777215);
    amount.anchor.set(0.5);
    amount.position.set(0, 45);
    amount.style = new TextStyle({ fontFamily: "Arial Black, Arial", fontSize: 112, fontWeight: "900", fill: verticalGradient([[0.03, 0x9dd6f7], [0.41, 0xd6ecf4], [0.68, 0x59b2e5]]), stroke: { color: 0xfffc33, width: 6 }, dropShadow: { color: 0x4d0201, blur: 3, distance: 5 } });
    const complete = label("FEATURE COMPLETE", 34, 16777215);
    complete.anchor.set(0.5);
    complete.position.set(0, 195);
    content.addChild(congratulations, amount, complete);
    this.effects.addChild(shade, content);
    this.audio.play("featureBanner", 0.4);
    // The "win" cue is the Freegame Tally sound: it plays here, at the
    // feature total-win tally, and never on base-game ways wins.
    this.audio.play("win", 0.45);
    await this.wait(3000);
    await exactTween(350, (t) => {
      content.alpha = 1 - t;
      shade.alpha = 1 - t;
    });
    content.destroy({ children: true });
    shade.destroy();
    window.__FEATURE_FINAL_TALLY__ = false;
  }
  updateMeters() {
    const portrait = this.app.screen.height / this.app.screen.width > 1.18;
    const balance = money(this.platform.getBalance());
    this.balanceText.text = portrait ? `Balance\n${balance}` : `Balance ${balance}`;
    this.betText.text = portrait ? `Bet\n${money(this.bet)}` : `Bet ${money(this.bet)}`;
    this.winText.text = portrait
      ? `Win\n${money(this.win)}`
      : `Win${this.win > 0 ? ` ${money(this.win)}` : ""}`;
    this.footerTime.text = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const waysLabel = `${(this.activeRows ** REELS).toLocaleString("en-US")} WAYS`;
    const verticalWaysLabel = waysLabel.replace(" ", "").split("").join("\n");
    this.waysText.text = verticalWaysLabel;
    this.waysTextRight.text = verticalWaysLabel;
    this.waysText.visible = true;
    this.waysTextRight.visible = true;
    this.featureText.text = this.mode === "base" ? "" : `FREE SPINS\n${this.freeSpinIndex} OF ${this.freeSpinIndex + this.freeSpins}`;
    this.featureTotalText.text = this.mode === "base" ? "" : money(this.featureWin);
    this.jackpots.forEach((jackpot, i) => {
      // The meter must match what a house award actually credits; both use the
      // local-demo housePrizeScale calibration from the outcome engine.
      const jackpotAmount = JACKPOTS[i].multiplier * this.bet * DEMO_PROBABILITIES.housePrizeScale;
      jackpot.value.text = i < 2 ? `$${jackpotAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : money(jackpotAmount);
      this.fitJackpotValue(jackpot);
    });
  }
  updateControls() {
    const idle = this.state === "idle" && !this.paused;
    const stopping = this.state === "spinning" && !this.paused;
    const portrait = this.app.screen.height / this.app.screen.width > 1.18;
    const baseIdle = idle && this.mode === "base";
    // Spin time keeps the original disabled spin outline. The reference has
    // quick-stop disabled, so the separate white stop-square is not shown.
    this.spinButton.visible = idle || stopping;
    // During autoplay the play button shows the remaining spin count and
    // stays tappable: spin() turns the tap into "stop autoplay".
    const autoArmed = this.autoplayRemaining > 0 && (idle || stopping);
    this.autoSpinDisplay.visible = autoArmed;
    if (autoArmed) this.autoSpinCount.text = `${this.autoplayRemaining}`;
    this.spinButton.setEnabled(idle || autoArmed);
    this.spinButton.setTexture(this.atlases.ui.texture("spin"));
    this.autoButton.visible = baseIdle;
    this.turboButton.visible = baseIdle;
    this.menuButton.visible = baseIdle || this.paused || this.state === "title";
    this.plusButton.visible = baseIdle;
    this.minusButton.visible = baseIdle;
    this.buyButton.visible = baseIdle && this.autoplayRemaining === 0;
    // The source stake panel (betBackground + coin icon) shows in both
    // orientations during base idle; the supplied desktop reference frame
    // shows it bottom-right in landscape.
    this.betBackdrop.visible = baseIdle;
    this.betIcon.visible = baseIdle;
    this.stakeHit.visible = baseIdle;
    this.autoBackdrop.visible = baseIdle && portrait;
    this.spinBackdrop.visible = (idle || stopping) && portrait;
    this.autoButton.setEnabled(baseIdle);
    this.turboButton.setEnabled(baseIdle);
    this.turboButton.setTexture(this.atlases.ui.texture(this.turbo ? "turboEnabled" : "turbo"));
    this.menuButton.setEnabled(baseIdle || this.paused || this.state === "title");
    this.plusButton.setEnabled(baseIdle);
    this.minusButton.setEnabled(baseIdle);
    this.buyButton.setEnabled(baseIdle && this.autoplayRemaining === 0);
  }
  changeBet(direction) {
    if (this.state !== "idle" || this.mode !== "base") return;
    const index = BET_LEVELS.indexOf(this.bet);
    const next = Math.max(0, Math.min(BET_LEVELS.length - 1, index + direction));
    this.bet = BET_LEVELS[next];
    this.platform.setBet(this.bet);
    this.audio.play(direction > 0 ? "betPlus" : "betMinus", 0.5);
    this.updateMeters();
  }
  toggleTurbo() {
    if (this.paused) return;
    this.turbo = !this.turbo;
    this.turboButton.setTexture(this.atlases.ui.texture(this.turbo ? "turboEnabled" : "turbo"));
    this.audio.play(this.turbo ? "turboOn" : "turboOff", 0.5);
  }
  autoplay() {
    if (this.autoplayRemaining > 0) {
      this.autoplayRemaining = 0;
      this.audio.play("click", 0.5);
      this.updateControls();
      return;
    }
    if (this.state !== "idle" || this.mode !== "base") return;
    this.audio.play("click", 0.5);
    this.showAutoplay();
  }
  async showMainMenu() {
    if (this.state !== "idle" && this.state !== "title") return;
    this.audio.play("buttonClick", 0.5);
    await ensureAtlases(this.atlases, ["settings"]);
    this.closeModal();
    this.modal.visible = true;
    this.modal.eventMode = "static";
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const portrait = this.isPortraitLayout();
    const footerH = this.footerHeight();
    const menuUnit = portrait ? Math.min(w / 540, h / 960) : Math.min(w / 1320, h / 750);
    // Shade the complete game area and leave only the real footer exposed.
    const shade = new Graphics().rect(0, 0, w, h - footerH).fill({ color: 10, alpha: 0.72 });
    this.modal.addChild(shade);
    const blur = new BlurFilter({ strength: 12 });
    this.background.filters = [blur];
    this.gameLayer.filters = [blur];
    const logo = new Sprite(this.atlases.base.texture("Logo"));
    logo.anchor.set(0.5);
    logo.width = portrait ? Math.min(w * 0.56, 250) : Math.min(250, 240 * menuUnit);
    logo.scale.y = logo.scale.x;
    logo.position.set(w / 2, portrait ? h * 0.07 : 79 * menuUnit);
    const close = new SpriteButton(this.atlases.settings.texture("close"), () => { this.audio.play("click", 0.5); this.closeModal(); });
    close.fit(Math.min(42, Math.max(26, 34 * menuUnit))).position.set(
      portrait ? w - 32 : w - 79 * menuUnit,
      portrait ? Math.max(32, h * 0.06) : 93 * menuUnit
    );
    this.modal.addChild(logo, close);
    const row = (iconName, textValue, y, action) => {
      const root = new Container();
      const iconSize = Math.max(36, Math.min(66, 64 * menuUnit));
      const icon = iconName === "information" ? new Container() : new Sprite(this.atlases.settings.texture(iconName));
      if (iconName === "information") {
        const circle = new Graphics().circle(0, 0, iconSize * 0.43).stroke({ color: 16777215, width: Math.max(1.5, 2.5 * menuUnit) });
        const info = label("i", iconSize * 0.72, 16777215);
        info.anchor.set(0.5);
        info.style.fontWeight = "400";
        info.style.dropShadow = null;
        icon.addChild(circle, info);
      } else {
        icon.anchor.set(0.5);
        icon.width = iconSize;
        icon.scale.y = icon.scale.x;
      }
      icon.x = -Math.min(200 * menuUnit, w * 0.25);
      const textSize = Math.max(28, Math.min(64, 62 * menuUnit));
      const text = label(textValue, textSize, 16777215, "left");
      text.anchor.set(0, 0.5);
      text.style.fontWeight = "400";
      text.style.dropShadow = null;
      text.x = -Math.min(104 * menuUnit, w * 0.13);
      const halfLine = Math.min(w * 0.41, 271 * menuUnit);
      const lineY = Math.max(34, 68 * menuUnit);
      const line = new Graphics().moveTo(-halfLine, lineY).lineTo(halfLine, lineY).stroke({ color: 16777215, alpha: 0.75, width: 1 });
      root.addChild(icon, text, line);
      root.position.set(w / 2, y);
      root.eventMode = "static";
      root.cursor = "pointer";
      root.on("pointertap", () => { this.audio.play("buttonClick", 0.5); action(root); });
      this.modal.addChild(root);
    };
    row(this.audio.muted ? "sound_off" : "sound_on", "Sound", h * (portrait ? 0.36 : 1 / 3), (root) => {
      const muted = this.audio.toggle();
      this.soundButton.text = muted ? "SOUND OFF" : "SOUND ON";
      root.children[0].texture = this.atlases.settings.texture(muted ? "sound_off" : "sound_on");
    });
    row("paytable", "Pay Table", h * (portrait ? 0.5 : 0.516), () => {
      this.closeModal();
      this.paytable.open(this.platform.getBalance(), this.bet);
    });
    row("information", "Information", h * (portrait ? 0.64 : 0.7), () => {
      this.closeModal();
      this.paytable.open(this.platform.getBalance(), this.bet);
    });
  }
  openPaytable() {
    if (this.state !== "idle" && this.state !== "title") return;
    this.audio.play("buttonClick", 0.5);
    this.paytable.open(this.platform.getBalance(), this.bet);
  }
  togglePause() {
    if (this.state === "title" || this.paytable.root.visible) return;
    // Pause toggles silently: no popup. The hamburger stays visible while
    // paused so the same button resumes the game.
    this.paused = !this.paused;
    this.closeModal();
    this.updateControls();
  }
  modalBase(titleText, body = "") {
    this.closeModal();
    this.modal.visible = true;
    this.modal.eventMode = "static";
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const shade = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.72 });
    const panelW = Math.min(500, w * 0.88);
    const panelH = Math.min(500, h * 0.75);
    const panel = new Graphics().roundRect(w / 2 - panelW / 2, h / 2 - panelH / 2, panelW, panelH, 18).fill(464478).stroke({ color: 6261720, width: 3 });
    const title = label(titleText, 32, 16771223);
    title.anchor.set(0.5);
    title.position.set(w / 2, h / 2 - panelH / 2 + 55);
    const content = label(body, 20, 16777215);
    content.anchor.set(0.5, 0);
    content.position.set(w / 2, h / 2 - panelH / 2 + 105);
    this.modal.addChild(shade, panel, title, content);
    return panel;
  }
  modalButton(textValue, x, y, color, action, width = 190) {
    const root = new Container();
    const bg = new Graphics().roundRect(-width / 2, -28, width, 56, 12).fill(color).stroke({ color: 16777215, alpha: 0.5, width: 2 });
    const text = label(textValue, 21);
    text.anchor.set(0.5);
    root.addChild(bg, text);
    root.position.set(x, y);
    root.eventMode = "static";
    root.cursor = "pointer";
    root.on("pointertap", () => {
      this.audio.play("slider", 0.5);
      action();
    });
    this.modal.addChild(root);
  }
  async showPillPage(titleText, options, selectedValue, onPick, format = (value) => `${value}`) {
    this.audio.play("buttonClick", 0.5);
    await ensureAtlases(this.atlases, ["settings"]);
    this.closeModal();
    this.modal.visible = true;
    this.modal.eventMode = "static";
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const shade = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.72 });
    this.modal.addChild(shade);
    const blur = new BlurFilter({ strength: 12 });
    this.background.filters = [blur];
    this.gameLayer.filters = [blur];
    const logo = new Sprite(this.atlases.base.texture("Logo"));
    logo.anchor.set(0.5);
    logo.width = Math.min(w * 0.34, 270);
    logo.scale.y = logo.scale.x;
    logo.position.set(w / 2, h * 0.12);
    const close = new SpriteButton(this.atlases.settings.texture("close"), () => { this.audio.play("click", 0.5); this.closeModal(); });
    close.fit(Math.max(42, w * 0.065)).position.set(w * 0.92, h * 0.06);
    const title = label(titleText, Math.min(54, w * 0.05), 16777215);
    title.anchor.set(0.5);
    title.position.set(w / 2, h * 0.25);
    this.modal.addChild(logo, close, title);
    const cols = 5;
    const rows = Math.ceil(options.length / cols);
    const pillW = Math.min(w * 0.155, 150);
    const pillH = Math.min(h * 0.062, 46);
    const gapX = pillW * 0.28;
    const gapY = pillH * 0.5;
    const gridW = cols * pillW + (cols - 1) * gapX;
    const gridH = rows * pillH + (rows - 1) * gapY;
    const startX = w / 2 - gridW / 2 + pillW / 2;
    const startY = h * 0.53 - gridH / 2 + pillH / 2;
    options.forEach((value, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const root = new Container();
      const selected = value === selectedValue;
      const bg = new Graphics().roundRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2).fill(selected ? 1866456 : 3359070).stroke({ color: 16777215, alpha: selected ? 0.9 : 0.35, width: 2 });
      const text = label(format(value), Math.min(24, pillH * 0.5), 16777215);
      text.anchor.set(0.5);
      root.addChild(bg, text);
      root.position.set(startX + col * (pillW + gapX), startY + row * (pillH + gapY));
      root.eventMode = "static";
      root.cursor = "pointer";
      root.on("pointertap", () => {
        this.audio.play("ovalButton", 0.5);
        onPick(value);
      });
      this.modal.addChild(root);
    });
  }
  showSelectBet() {
    if (this.state !== "idle" || this.mode !== "base" || this.modal.visible) return;
    void this.showPillPage("Select Bet", BET_LEVELS, this.bet, (level) => {
      this.bet = level;
      this.platform.setBet(level);
      this.updateMeters();
      this.closeModal();
      this.updateControls();
    }, (value) => money(value));
  }
  showAutoplay() {
    void this.showPillPage("AUTOPLAY", [10, 25, 50, 75, 100], null, (count) => {
      this.autoplayRemaining = count;
      this.closeModal();
      void this.performSpin(false, false);
    });
  }
  showBuyPass() {
    if (this.state !== "idle" || this.mode !== "base" || this.autoplayRemaining > 0) return;
    this.audio.play("click", 0.5);
    this.closeModal();
    this.modal.visible = true;
    this.modal.eventMode = "static";
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const shade = new Graphics().rect(0, 0, w, h).fill({ color: 0, alpha: 0.67 });
    const root = new Container();
    const scale = Math.min(w * 0.985 / 632, h * 0.67 / 453);
    root.scale.set(scale);
    root.position.set(w / 2, h * 0.455);
    const panel = new Sprite(this.atlases.buypass.texture("background"));
    panel.anchor.set(0.5);
    root.addChild(panel);
    const title = label("BUY PASS™", 25, 16777215);
    title.anchor.set(0.5);
    title.position.set(0, -199);
    const description = label("BUY PASS™ IS A PREMIUM FEATURE THAT ALLOWS ENTRY DIRECTLY INTO FREE SPINS FEATURE\nOR SUPER SAW FREE SPINS!", 12, 16777215);
    description.anchor.set(0.5, 0);
    description.position.set(0, -166);
    const inner = new Sprite(this.atlases.buypass.texture("buy_pass_panel"));
    inner.anchor.set(0.5);
    inner.position.set(0, 5);
    const symbol = new Sprite(this.atlases.buypass.texture("buypass_symbol"));
    symbol.anchor.set(0.5);
    symbol.width = 175;
    symbol.scale.y = symbol.scale.x;
    symbol.position.set(0, -58);
    const cost = label(money(this.bet * BUY_PASS_MULTIPLIER), 20, 16777215);
    cost.anchor.set(0.5);
    cost.position.set(0, 25);
    const costCaption = label("TOTAL COST", 17, 16777215);
    costCaption.anchor.set(0.5);
    costCaption.position.set(0, 51);
    root.addChild(title, description, inner, symbol, cost, costCaption);
    // BUY asks for confirmation first: the purchase only proceeds from the
    // dialog's YES button, mirroring the supplied confirmation screen.
    const runPurchase = async () => {
      this.audio.play("ovalButton", 0.5);
      this.audio.play("buyPassIntro", 0.4);
      this.closeModal();
      const outcome = await this.platform.buyPass({ seed: this.baseSeed + ++this.spinCounter * 7919 >>> 0 });
      this.prepaidScenario = outcome.scenario;
      await this.performSpin(false, true);
    };
    const confirm = new Container();
    {
      const dim = new Graphics().roundRect(-316, -227, 632, 453, 18).fill({ color: 0, alpha: 0.55 });
      const box = new Graphics()
        .roundRect(-200, -122, 400, 255, 22)
        .fill({ color: 0x0B0B60 })
        .stroke({ width: 4, color: 0xB45A12 })
        .roundRect(-193, -115, 386, 241, 18)
        .stroke({ width: 2, color: 0xE59B3C });
      const question = label(`DO YOU WISH TO PURCHASE FREE SPINS\nFEATURE OR SUPER SAW FREE SPINS FOR\n${money(this.bet * BUY_PASS_MULTIPLIER)}?`, 16, 16777215);
      question.anchor.set(0.5);
      question.position.set(0, -38);
      const no = new SpriteButton(this.atlases.buypass.texture("buy_button_no"), () => {
        this.audio.play("click", 0.5);
        confirm.removeFromParent();
      }, undefined, this.atlases.buypass.texture("buy_button_no_down"));
      no.fit(150, 56).position.set(-90, 84);
      const noText = label("NO", 24, 16777215);
      noText.eventMode = "none";
      noText.anchor.set(0.5);
      noText.position.set(-90, 84);
      const yes = new SpriteButton(this.atlases.buypass.texture("buy_button_yes"), () => void runPurchase(), undefined, this.atlases.buypass.texture("buy_button_yes_down"));
      yes.fit(150, 56).position.set(90, 84);
      const yesText = label("YES", 24, 16777215);
      yesText.eventMode = "none";
      yesText.anchor.set(0.5);
      yesText.position.set(90, 84);
      confirm.addChild(dim, box, question, no, noText, yes, yesText);
    }
    const buy = new SpriteButton(this.atlases.buypass.texture("buy_button_yes"), () => {
      this.audio.play("click", 0.5);
      if (!confirm.parent) root.addChild(confirm);
    }, undefined, this.atlases.buypass.texture("buy_button_yes_down"));
    buy.fit(156, 58).position.set(0, 86);
    const buyText = label("BUY", 28, 16777215);
    buyText.eventMode = "none";
    buyText.anchor.set(0.5);
    buyText.position.set(0, 86);
    root.addChild(buy, buyText);
    const stakeScreen = new Sprite(this.atlases.buypass.texture("Digits_Screen"));
    stakeScreen.anchor.set(0.5);
    stakeScreen.position.set(0, 177);
    const stake = label(money(this.bet), 23, 16777215);
    stake.anchor.set(0.5);
    stake.position.set(0, 177);
    const changeStake = (direction) => {
      this.changeBet(direction);
      stake.text = money(this.bet);
      cost.text = money(this.bet * BUY_PASS_MULTIPLIER);
    };
    const minus = new SpriteButton(this.atlases.buypass.texture("Minus_button"), () => changeStake(-1), undefined, this.atlases.buypass.texture("Minus_button_down"));
    const plus = new SpriteButton(this.atlases.buypass.texture("plus_button"), () => changeStake(1), undefined, this.atlases.buypass.texture("plus_button_down"));
    minus.fit(84, 61).position.set(-85, 177);
    plus.fit(84, 61).position.set(85, 177);
    const note = label("*... Changing Stake here will also\nchange Stake for main game.", 10, 16777215, "left");
    note.anchor.set(0, 0.5);
    note.position.set(142, 177);
    const close = new SpriteButton(this.atlases.buypass.texture("cross_base"), () => { this.audio.play("click", 0.5); this.closeModal(); }, undefined, this.atlases.buypass.texture("cross_down"));
    close.fit(52).position.set(278, -200);
    root.addChild(stakeScreen, stake, minus, plus, note, close);
    this.modal.addChild(shade, root);
  }
  closeModal() {
    this.modal.removeChildren().forEach((child) => child.destroy());
    this.modal.visible = false;
    this.background.filters = null;
    this.gameLayer.filters = null;
  }
  dispose() {
    this.disposed = true;
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.audio.dispose();
    this.spines.dispose();
    delete window.__slotDebug;
    window.__GAME_READY__ = false;
  }
}
export {
  SlotGame
};
