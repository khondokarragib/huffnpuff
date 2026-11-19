var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Rectangle, Texture } from "../../vendor.js";
const EXTENSIONS = ["webp", "png", "jpg"];
const ATLAS_EXTENSIONS = {
  settings: ["png"],
  fireworks: ["jpg"],
  numberGlow: ["jpg"],
  bigwinDigits: ["jpg"]
};
// The supplied original bundle selects desktop assets for non-mobile user
// agents. Keep that device boundary, while treating HD pixels as 2× logical
// coordinates so the established responsive layout remains unchanged.
const MOBILE_DEVICE = /Android|HTC|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium/.test(navigator.userAgent) && navigator.maxTouchPoints === 5);
const ASSET_DEVICE = MOBILE_DEVICE ? "mobile" : "desktop";
const ASSET_PIXEL_RATIO = ASSET_DEVICE === "desktop" ? 2 : 1;
// Most desktop HD atlases contain twice the logical pixels. The background is
// the documented exception: its 1920×1920 artwork already matches the original
// 1920×1920 landscape render stage. Dividing it by two makes the source
// registration (960,877) and landscape offset (0,300) geometrically impossible.
const DESKTOP_ATLAS_PIXEL_RATIOS = {
  baseBackground: 1,
  freeBackground: 1,
  baseBackgroundNew: 1,
  freeBackgroundNew: 1
};
const deviceAssetPath = (path) => {
  if (ASSET_DEVICE !== "desktop" || !path.startsWith("mobile/images/")) return path;
  return path.replace(/^mobile\//, "desktop/").replace(/-sd(\.json)$/, "-hd$1");
};
class FrameAtlas {
  constructor(data, pages, pixelRatio = 1) {
    __publicField(this, "data", data);
    __publicField(this, "pages", pages);
    __publicField(this, "pixelRatio", pixelRatio);
    __publicField(this, "cache", /* @__PURE__ */ new Map());
  }
  animation(name) {
    const cached = this.cache.get(name);
    if (cached) return cached;
    const animation = this.data.animations[name];
    if (!animation) throw new Error(`Missing atlas animation: ${name}`);
    const textures = animation.frames.map((index) => {
      const f = this.data.frames[index];
      const source = this.pages[f[4]].source;
      const unit = 1 / this.pixelRatio;
      const texture = new Texture({
        source,
        frame: new Rectangle(f[0] * unit, f[1] * unit, f[2] * unit, f[3] * unit),
        orig: new Rectangle(0, 0, f[7] * unit, f[8] * unit),
        trim: new Rectangle(f[9] * unit, f[10] * unit, f[2] * unit, f[3] * unit),
        label: `${name}:${index}`
      });
      // Original AnimatedSprite.updateVertices(): the atlas registration point
      // is divided by the trimmed frame size, independently for every frame.
      texture.sourceAnchor = { x: f[5] / f[2], y: f[6] / f[3] };
      return texture;
    });
    this.cache.set(name, textures);
    return textures;
  }
  texture(name) {
    return this.animation(name)[0];
  }
  get fps() {
    return this.data.framerate || 24;
  }
}
const PATHS = {
  baseBackground: "mobile/images/backgrounds/basegame/basegame_bkg-sd.json",
  freeBackground: "mobile/images/backgrounds/freespins/freespin_bkg-sd.json",
  base: "mobile/images/basegame/basegame-sd.json",
  symbols: "mobile/images/symbols/others/sym-sd.json",
  hats: "mobile/images/symbols/staticframes/static_hat-sd.json",
  yellowHat: "mobile/images/symbols/yellow_hat/yellow_hat-sd.json",
  horizontalHat: "mobile/images/symbols/yellow_horizontal/yellow_horizontal-sd.json",
  verticalHat: "mobile/images/symbols/yellow_vertical/yellow_vertical-sd.json",
  whiteHat: "mobile/images/symbols/white_hat/white_hat-sd.json",
  greenHat: "mobile/images/symbols/green_hat/green_supersaw-sd.json",
  ui: "shared/basegameui/basegameuihd.json",
  paytable: "mobile/images/paytable/paytable-sd.json",
  freespin: "mobile/images/freespin/freespin-sd.json",
  buypass: "mobile/images/buypass/buypass-sd.json",
  loading: "mobile/images/loading/loding-sd.json",
  birds: "mobile/images/backgrounds/birds/birds-sd.json",
  baseBackgroundNew: "mobile/images/backgrounds/new2/basegame_bkg-sd.json",
  freeBackgroundNew: "mobile/images/backgrounds/new2/freespin_bkg-sd.json",
  bigwinDigits: "mobile/images/bigwin/bigwin-sd.json",
  bigwinParticles: "mobile/images/bigwinparticles/bigwin-sd.json",
  clickStart: "mobile/images/clicktostartbuttonbg/ui-sd.json",
  constructionCloud: "mobile/images/constructioncloud/smoke_hat-sd.json",
  wind: "mobile/images/freespin/wind-sd.json",
  windBricks: "mobile/images/freespin/windbrickc-sd.json",
  fsBlast: "mobile/images/fsblast/smokeout-sd.json",
  bigwinAssets: "mobile/images/newbigwin/assets/bigwin_assets_-sd.json",
  centerParticles: "mobile/images/newbigwin/centerparticles/center_particles_-sd.json",
  fireworks: "mobile/images/newbigwin/fireworks/fireworks-sd.json",
  numberGlow: "mobile/images/newbigwin/numberglow/bigwin-sd.json",
  newBigwinParticles: "mobile/images/newbigwin/particles/bigwin_particles_-sd.json",
  rowsBlast: "mobile/images/rowsblast/scanfolding-sd.json",
  symbolParticle: "mobile/images/symbols/particle/particle-sd.json",
  trailCloud: "mobile/images/trailclouds/cloud-sd.json",
  betAutoplay: "shared/betautoplay/betautoplayswitchbuttons.json",
  settings: "shared/paytable/settings.json"
};
const assetUrl = (path) => new URL(`assets/${path}`, document.baseURI).href;
const retryUrl = (url, attempt) => attempt ? `${url}${url.includes("?") ? "&" : "?"}assetRetry=${attempt}` : url;
async function withRetries(operation, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
async function mapLimited(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
// Preload every mapped atlas (feature, wind, big-win, row-blast, particle,
// construction/trail cloud, click-start) during the loading screen so no
// reel stop or feature animation waits on a first-use fetch. The loading
// atlas itself is already loaded separately for the splash. The legacy
// freeBackground mapping is excluded: no game code references it (only
// freeBackgroundNew is used) and its desktop HD variant ships pages without
// an atlas JSON, so loading it would fail on desktop.
const STARTUP_ATLASES = Object.keys(PATHS).filter((name) => name !== "loading" && name !== "freeBackground");
const pending = /* @__PURE__ */ new WeakMap();
async function loadTexture(url, resolution = url.includes("/assets/desktop/") ? ASSET_PIXEL_RATIO : 1) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(retryUrl(url, attempt), { cache: attempt ? "no-cache" : "default" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const bitmap = await createImageBitmap(await response.blob());
      const texture = Texture.from(bitmap);
      texture.source.resolution = resolution;
      texture.update();
      return texture;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt));
    }
  }
  throw new Error(`Unable to load ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
async function loadOneAtlas(name) {
  const path = deviceAssetPath(PATHS[name]);
  const data = await withRetries(async (attempt) => {
    const response = await fetch(retryUrl(assetUrl(path), attempt), { cache: attempt ? "no-cache" : "default" });
    if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
    return await response.json();
  }, 5);
  const folder = path.slice(0, path.lastIndexOf("/"));
  const pixelRatio = path.startsWith("desktop/") ? DESKTOP_ATLAS_PIXEL_RATIOS[name] ?? ASSET_PIXEL_RATIO : 1;
  const pages = await mapLimited(data.images, 2, async (image) => {
    for (const extension of ATLAS_EXTENSIONS[name] || EXTENSIONS) {
      try {
        return await loadTexture(assetUrl(`${folder}/${image}.${extension}`), pixelRatio);
      } catch {
      }
    }
    throw new Error(`Unable to load texture page ${folder}/${image}`);
  });
  return new FrameAtlas(data, pages, pixelRatio);
}
async function ensureAtlases(target, names, onProgress) {
  let requests = pending.get(target);
  if (!requests) {
    requests = /* @__PURE__ */ new Map();
    pending.set(target, requests);
  }
  const requested = requests;
  const unique = [...new Set(names)];
  let completed = 0;
  await mapLimited(unique, 2, async (name) => {
    if (target[name]) {
      onProgress?.(++completed, unique.length);
      return;
    }
    let request = requested.get(name);
    if (!request) {
      request = loadOneAtlas(name).then((atlas) => {
        target[name] = atlas;
      }).finally(() => requested.delete(name));
      requested.set(name, request);
    }
    await request;
    onProgress?.(++completed, unique.length);
  });
}
async function loadAtlases(onProgress) {
  const result = {};
  await ensureAtlases(result, STARTUP_ATLASES, onProgress);
  return result;
}
export {
  ASSET_DEVICE,
  ASSET_PIXEL_RATIO,
  FrameAtlas,
  assetUrl,
  deviceAssetPath,
  ensureAtlases,
  loadAtlases,
  loadTexture,
  mapLimited,
  retryUrl,
  withRetries
};
