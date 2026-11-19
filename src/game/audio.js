var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { assetUrl, mapLimited } from "./atlas.js";
import { storage } from "./storage.js";
const FILES = {
  // UI (GDM.UI.BaseGameUI.Sounds / Paytable.Sounds)
  click: "fx_button.webm",
  buttonClick: "btn_click.webm",
  ovalButton: "ovalbutton.webm",
  slider: "btnslider.webm",
  betMinus: "bet_minus.webm",
  betPlus: "bet_plus.webm",
  turboOn: "turboon.webm",
  turboOff: "turbooff.webm",
  backToLobby: "back_to_lobby.webm",
  spin: "spin.webm",
  stop: "fx_reel_stop.webm",
  stopMid: "stopmid.webm",
  // Hat landings (GIG / Freegame.HardhatLand / BuzzsawLand)
  hat: "yellow_hat_land.webm",
  whiteHatLand: "whitehatswoosh.webm",
  // Feature entry (Freegame.Trigger / banner / waitscreen)
  feature: "fx_feature_trigger.webm",
  featureBanner: "fx_freegames_banner.webm",
  featureWaitIntro: "fx_freegames_waitscreen_intro.webm",
  featureWaitMusic: "fx_freegames_waitscreen_music.webm",
  creditMeterIntro: "fx_intro_creditmeter.webm",
  hardhatsReveal: "fx_hardhats_reveal_with_creditmeter.webm",
  buyPassIntro: "fx_bigwheel_feature_intro.webm",
  // Super Saw (Buzzsaw.* / GreenSawSignRotate / HardhatShift)
  superBanner: "fx_buzzsaw_spinningbanner.webm",
  superWaitMusic: "fx_buzzsaw_waitscreen_music.webm",
  superLandBuzzsaw: "fx_bigwheel_land_buzzsaw.webm",
  buzzsawTransform: "fx_buzzsaw_transform_hat.webm",
  buzzsawSpinning: "fx_buzzsaw_smallsaw.webm",
  hatTransfer: "fx_hat_transfer_1.webm",
  hatTransferLand: "fx_hat_transfer_landing.webm",
  sawFlip: "sawflip_5_eq.webm",
  superSawIntro: "supersawintro2_l2.webm",
  // Mystery
  mystery: "stopmid.webm",
  // Frames and houses (Freegame.*Frame / *House / *HouseCredit / Blow*House)
  frameStraw: "fx_strawborder_e.webm",
  frameStick: "fx_stickborder_e.webm",
  frameBrick: "fx_brickborder_e.webm",
  houseStraw: "fx_strawhouse_appears.webm",
  houseStick: "fx_stickhouse_appears.webm",
  houseBrick: "fx_brickhouse_appears.webm",
  houseCreditStraw: "fx_strawhouse_creditprize_reveal.webm",
  houseCreditStick: "fx_stickhouse_creditprize_quickreveal.webm",
  houseCreditBrick: "fx_brickhouse_creditprize_quickreveal.webm",
  blowStraw: "fx_strawhousereveal_creditprize.webm",
  blowStick: "fx_stickhousereveal_creditprize.webm",
  blowBrick: "fx_brickhousereveal_bonusprize.webm",
  // Wolf feature (Freegame.Wolf*)
  wolfStraw: "fx_wolffeature_blowstraw_updated_2.webm",
  wolfStick: "fx_wolffeature_blowstick_updated_2.webm",
  wolfBrick: "fx_wolffeature_blowbrick_updated_2.webm",
  wolfMusic: "fx_wolffeature_music.webm",
  wolfJumpDown: "fx_wolffeature_jumpdown.webm",
  wolfJumpDownComplete: "fx_wolffeature_jumpdown_complete.webm",
  wolfResolution: "fx_wolffeature_resolution.webm",
  jackpotLand: "fx_bigwheel_land_credits.webm",
  // Wins (Freegame.Tally / BigWin.Tier1-7)
  win: "win16a.webm",
  bigwin1: "bw_tier1.webm",
  bigwin2: "bw_tier2.webm",
  bigwin3: "bw_tier3.webm",
  bigwin4: "bw_tier4.webm",
  bigwin5: "bw_tier5.webm",
  bigwin6: "bw_tier6.webm",
  bigwin7: "bw_tier7.webm",
  // Girder (Precog.GirderDrop / Girder.* / Pig.StompNHatFall)
  girder: "girderdrop.webm",
  girderIntro: "basegame_girder_4_intro.webm",
  girderLoop: "basegame_girder_4_loop.webm",
  girderRaise: "girderraise.webm",
  girderRaiseShort: "girderraise_short.webm",
  girderLower: "girderlower1.webm",
  pigStomp: "stomp_fall.webm",
  // Row unlock (BlastingPigAppear / RowBlast / RowBlastingBackground)
  blastingPig: "demopig_new_1.webm",
  rowBlast: "demohitexpl.webm",
  rowBlastBackground: "flamepuff.webm",
  freeMusic: "fx_freegames_music.webm"
};
// Per-reel hat anticipation sounds and per-reel saw trail sounds.
for (let index = 1; index <= 5; index++) {
  FILES[`hardhatLand${index}`] = `fx_hardhat_scatter_${index}.webm`;
  FILES[`buzzsawLand${index}`] = `fx_buzzsaw_scatter_${index}.webm`;
  FILES[`sawTrail${index}`] = `fx_buzzsaw_anim_reel${index}.webm`;
}
for (let index = 1; index <= 15; index++) FILES[`superSawLand${index}`] = `sawhatland${index}.webm`;
const SOUND_ROOT = "shared/sounds";
class AudioSystem {
  constructor() {
    __publicField(this, "muted", storage.get("hnphr.muted", false));
    __publicField(this, "music", null);
    __publicField(this, "sfx", /* @__PURE__ */ new Set());
    // Preloaded elements keep the browser from fetching/decoding on the first
    // play of a sound — without this the first hat landing sounds arrive late,
    // after the reels have already finished. Each name owns a small pool of
    // persistent elements: mobile browsers re-fetch and re-decode every fresh
    // cloneNode(), which is what made playback lag behind the animation. Reused
    // warm elements start instantly instead.
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "dedicated", /* @__PURE__ */ new Set());
  }
  soundUrl(name) {
    if (!FILES[name]) throw new Error(`Unknown sound: ${name}`);
    return assetUrl(`${SOUND_ROOT}/${FILES[name]}`);
  }
  createAudio(name) {
    const audio = new Audio(this.soundUrl(name));
    audio.preload = "auto";
    return audio;
  }
  preload(names) {
    for (const name of names) {
      if (this.cache.has(name) || !FILES[name]) continue;
      const audio = this.createAudio(name);
      audio.load();
      this.cache.set(name, [audio]);
    }
  }
  async load(name) {
    if (this.cache.has(name)) return;
    const audio = this.createAudio(name);
    this.cache.set(name, [audio]);
    await new Promise((resolve, reject) => {
      let settled = false;
      let timer = 0;
      const cleanup = () => {
        clearTimeout(timer);
        audio.removeEventListener("loadeddata", finish);
        audio.removeEventListener("canplay", finish);
        audio.removeEventListener("canplaythrough", finish);
        audio.removeEventListener("error", fail);
      };
      const finish = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Unable to preload sound: ${FILES[name]}`));
      };
      audio.addEventListener("loadeddata", finish, { once: true });
      audio.addEventListener("canplay", finish, { once: true });
      audio.addEventListener("canplaythrough", finish, { once: true });
      audio.addEventListener("error", fail, { once: true });
      timer = setTimeout(fail, 10000);
      if (audio.readyState >= 2) finish();
      else audio.load();
    });
  }
  async preloadAll(onProgress) {
    const names = Object.keys(FILES);
    let completed = 0;
    await mapLimited(names, 8, async (name) => {
      try {
        await this.load(name);
      } finally {
        completed += 1;
        onProgress?.(completed, names.length);
      }
    });
  }
  debug() {
    return {
      mappedCount: Object.keys(FILES).length,
      cachedCount: this.cache.size,
      cachedNames: [...this.cache.keys()]
    };
  }
  play(name, volume = 0.5) {
    // Return the media object even when muted so presentation timing can still
    // follow the original sound duration without playing audible output.
    if (this.muted) {
      const silent = this.createAudio(name);
      silent.volume = volume;
      return silent;
    }
    let pool = this.cache.get(name);
    if (!pool) {
      pool = [this.createAudio(name)];
      this.cache.set(name, pool);
    }
    // Prefer an idle warm element; grow the pool to three for overlapping
    // cues; beyond that restart the oldest non-dedicated element. Looping and
    // music elements are dedicated and are never stolen by short SFX.
    let audio = pool.find((element) => (element.paused || element.ended) && !this.dedicated.has(element));
    if (!audio) {
      const stealable = pool.filter((element) => !this.dedicated.has(element));
      if (pool.length < 3 || !stealable.length) {
        audio = this.createAudio(name);
        pool.push(audio);
      } else {
        audio = stealable[0];
      }
    }
    if (!audio.__pooled) {
      audio.__pooled = true;
      audio.addEventListener("ended", () => this.sfx.delete(audio));
    }
    audio.loop = false;
    audio.volume = volume;
    try {
      audio.currentTime = 0;
    } catch {
    }
    this.sfx.add(audio);
    void audio.play().catch(() => void 0);
    return audio;
  }
  async duration(audio) {
    if (!audio) return 0;
    if (Number.isFinite(audio.duration)) return audio.duration;
    await new Promise((resolve) => {
      let timer = 0;
      const finish = () => {
        clearTimeout(timer);
        audio.removeEventListener("loadedmetadata", finish);
        audio.removeEventListener("error", finish);
        resolve();
      };
      audio.addEventListener("loadedmetadata", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      timer = setTimeout(finish, 3000);
    });
    return Number.isFinite(audio.duration) ? audio.duration : 0;
  }
  stopSfx() {
    for (const audio of this.sfx) audio.pause();
    this.sfx.clear();
    this.dedicated.clear();
  }
  stop(audio) {
    if (!audio) return;
    audio.pause();
    this.sfx.delete(audio);
    this.dedicated.delete(audio);
  }
  // Looping event background (girder activity, wait screens). Caller stops it
  // with stop(); stopSfx() also clears it.
  playLoop(name, volume = 0.35) {
    const audio = this.play(name, volume);
    if (audio) {
      audio.loop = true;
      // Looping event backgrounds must survive SFX pressure: play() never
      // steals a dedicated element, and stop()/stopSfx() end the loop.
      this.dedicated.add(audio);
    }
    return audio;
  }
  startMusic(name, volume = 0.2) {
    this.stopMusic();
    if (this.muted) return;
    // Reuse the preloaded element so looping music starts immediately instead
    // of fetching/decoding its file at feature entry.
    const pool = this.cache.get(name);
    const cached = pool?.[0];
    this.music = cached ? cached.cloneNode() : this.createAudio(name);
    this.music.loop = true;
    this.music.volume = volume;
    void this.music.play().catch(() => void 0);
  }
  startFreeMusic() {
    this.startMusic("freeMusic");
  }
  stopMusic() {
    this.music?.pause();
    this.music = null;
  }
  toggle() {
    this.muted = !this.muted;
    storage.set("hnphr.muted", this.muted);
    if (this.muted) {
      this.stopMusic();
      this.stopSfx();
    }
    return this.muted;
  }
  dispose() {
    this.stopMusic();
    this.stopSfx();
    this.cache.clear();
    this.dedicated.clear();
  }
}
export {
  AudioSystem
};
