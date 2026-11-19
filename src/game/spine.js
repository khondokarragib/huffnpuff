var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Cache, Spine, SpineTexture, TextureAtlas } from "../../vendor.js";
import { ASSET_DEVICE, assetUrl, deviceAssetPath, loadTexture, mapLimited, retryUrl, withRetries } from "./atlas.js";
const DEFINITIONS = {
  logo: { folder: "mobile/images/spines/game_logo/0.5", file: "game_logo.webp" },
  background: { folder: "mobile/images/spines/background_loop_anim/loading/0.5", file: "skeleton.webp" },
  tally: { folder: "mobile/images/spines/fstally/0.5", file: "tally.webp" },
  hangingHats: { folder: "mobile/images/spines/hat_bouncing/0.5", file: "antick_idle_animation.webp" },
  blastingPig: { folder: "mobile/images/spines/pig_04_blasting/0.5", file: "pig_04.webp" },
  symbols: { folder: "mobile/images/spines/symbols/0.5", file: "symbol.webp" },
  pig3: { folder: "mobile/images/spines/pig_03/0.5", file: "pig_03_animation.webp" },
  pig2: { folder: "mobile/images/spines/pig_02/0.5", file: "pig_02_animation.webp" },
  pig1: { folder: "mobile/images/spines/pig_01/0.5", file: "brick.webp" },
  coin: { folder: "mobile/images/spines/coin/0.5", file: "coin_v02.webp" },
  jackpot: { folder: "mobile/images/spines/jackpot_tallys/0.5", file: "coin.webp" },
  houses: { folder: "mobile/images/spines/houses/0.5", file: "houses_v03.webp" },
  wolf: { folder: "mobile/images/spines/wolf/0.5", file: "skeleton.webp" },
  bigwinSmoke: { folder: "mobile/images/spines/bigwin/0.5", file: "skeleton.webp" },
  bigwin: { folder: "mobile/images/newbigwin/spineanim/0.5", file: "bigwin_02.webp" }
};
const skeletonAlias = (name) => `hnphr-spine-${name}-skeleton`;
const atlasAlias = (name) => `hnphr-spine-${name}-atlas`;
// Preload every Spine set (tally, houses, wolf, coin, jackpot, blasting pig,
// both big-win sets) during the loading screen so no feature scene decodes
// skeleton data or texture pages on first use.
const STARTUP_SPINES = Object.keys(DEFINITIONS);
async function fetchSpineFile(url, read) {
  return withRetries(async (attempt) => {
    const response = await fetch(retryUrl(url, attempt), { cache: attempt ? "no-cache" : "default" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return read(response);
  }, 5);
}
function atlasPageNames(atlasText) {
  const lines = atlasText.split(/\r?\n/);
  const pages = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() && /^size\s*:/.test(lines[i + 1])) pages.push(lines[i].trim());
  }
  if (!pages.length) throw new Error("Spine atlas has no texture pages");
  return pages;
}
async function loadSpineSet(name) {
  const definition = DEFINITIONS[name];
  const folder = deviceAssetPath(definition.folder).replace(/\/0\.5$/, ASSET_DEVICE === "desktop" ? "/1" : "/0.5");
  const skeletonUrl = assetUrl(`${folder}/${definition.file}.json`);
  const atlasUrl = assetUrl(`${folder}/${definition.file}.atlas`);
  try {
    const [skeletonAsset, atlasText] = await Promise.all([
      fetchSpineFile(skeletonUrl, (response) => response.json()),
      fetchSpineFile(atlasUrl, (response) => response.text())
    ]);
    const pageNames = atlasPageNames(atlasText);
    const pageTextures = await mapLimited(pageNames, 2, async (pageName) => {
      const texture = await loadTexture(assetUrl(`${folder}/${pageName}`));
      return [pageName, texture.source];
    });
    const images = Object.fromEntries(pageTextures);
    const atlasAsset = new TextureAtlas(atlasText);
    for (const page of atlasAsset.pages) {
      const source = images[page.name];
      if (!source) throw new Error(`Missing Spine atlas page: ${page.name}`);
      page.setTexture(SpineTexture.from(source));
    }
    Cache.set(skeletonAlias(name), skeletonAsset);
    Cache.set(atlasAlias(name), atlasAsset);
  } catch (error) {
    throw new Error(`Unable to load Spine ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function loadSpines(onProgress, system = new SpineSystem()) {
  await system.ensure(STARTUP_SPINES, onProgress);
  return system;
}
class SpineSystem {
  constructor() {
    __publicField(this, "instances", /* @__PURE__ */ new Set());
    __publicField(this, "loaded", /* @__PURE__ */ new Set());
    __publicField(this, "pendingAnimations", /* @__PURE__ */ new Map());
  }
  async ensure(names, onProgress) {
    const missing = [...new Set(names)].filter((name) => !this.loaded.has(name));
    let completed = 0;
    await mapLimited(missing, 2, async (name) => {
      await loadSpineSet(name);
      this.loaded.add(name);
      onProgress?.(++completed, missing.length);
    });
  }
  create(name, animation, loop = true) {
    if (!this.loaded.has(name)) throw new Error(`Spine asset is not loaded: ${name}`);
    const spine = Spine.from({
      skeleton: skeletonAlias(name),
      atlas: atlasAlias(name),
      scale: 1,
      autoUpdate: false
    });
    spine.autoUpdate = false;
    // Match the original loader: manifest resolution belongs to the texture
    // pages, while every Spine instance starts at its unmodified scale of 1.
    this.instances.add(spine);
    if (animation) this.play(spine, animation, loop);
    else spine.update(0);
    return spine;
  }
  play(spine, animation, loop = true, track = 0) {
    this.playWithOptions(spine, animation, { loop, track });
  }
  playWithOptions(spine, animation, options = {}) {
    const { loop = false, track = 0, speed = 1, reverse = false, startTime = 0 } = options;
    const data = spine.skeleton.data.findAnimation(animation);
    if (!data) throw new Error(`Missing Spine animation: ${animation}`);
    const entry = spine.state.setAnimation(track, animation, loop);
    entry.timeScale = speed;
    entry.reverse = reverse;
    entry.trackTime = reverse ? data.duration : startTime;
    spine.update(0);
    if (loop) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (entry) => {
        if (settled || entry && entry.trackIndex !== track) return;
        settled = true;
        spine.state.removeListener(listener);
        const pending = this.pendingAnimations.get(spine);
        pending?.delete(finish);
        if (pending && !pending.size) this.pendingAnimations.delete(spine);
        resolve();
      };
      const listener = {
        complete: finish,
        interrupt: finish
      };
      const pending = this.pendingAnimations.get(spine) || new Set();
      pending.add(finish);
      this.pendingAnimations.set(spine, pending);
      spine.state.addListener(listener);
    });
  }
  stop(spine, animation) {
    const data = spine.skeleton.data.findAnimation(animation);
    if (!data) throw new Error(`Missing Spine animation: ${animation}`);
    spine.state.setEmptyAnimation(0, 0);
    spine.skeleton.setToSetupPose();
    spine.state.setAnimation(0, animation, false);
    const entry = spine.state.getCurrent(0);
    // Original gotoAndStop starts at the clip's supplied startTime (zero by
    // default), then pauses; it does not jump to the final pose.
    entry.trackTime = 0;
    entry.timeScale = 0;
    spine.update(0);
  }
  duration(spine, animation) {
    return spine.skeleton.data.findAnimation(animation)?.duration ?? 1;
  }
  update(dt) {
    for (const spine of this.instances) {
      let visible = spine.visible;
      let parent = spine.parent;
      while (visible && parent) {
        visible = parent.visible;
        parent = parent.parent;
      }
      if (visible) spine.update(dt);
    }
  }
  release(spine) {
    const pending = this.pendingAnimations.get(spine);
    if (pending) for (const finish of [...pending]) finish();
    this.instances.delete(spine);
    spine.destroy();
  }
  dispose() {
    for (const spine of this.instances) {
      const pending = this.pendingAnimations.get(spine);
      if (pending) for (const finish of [...pending]) finish();
      spine.destroy();
    }
    this.instances.clear();
    this.pendingAnimations.clear();
  }
}
function fitSpine(spine, width, height) {
  spine.scale.set(1);
  spine.pivot.set(0);
  spine.update(0);
  const bounds = spine.getLocalBounds();
  if (!bounds.width || !bounds.height || !Number.isFinite(bounds.width + bounds.height)) return;
  const scale = Math.min(width / bounds.width, height / bounds.height);
  spine.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  spine.scale.set(scale);
}
export {
  SpineSystem,
  fitSpine,
  loadSpines
};
