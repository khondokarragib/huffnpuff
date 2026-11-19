import { Application, Text, TextStyle } from "../../vendor.js";
import { assetUrl, deviceAssetPath, ensureAtlases, loadAtlases, loadTexture } from "./atlas.js";
import { AudioSystem } from "./audio.js";
import { LoadingScreen } from "./loading.js";
import { loadSpines, SpineSystem } from "./spine.js";
import { SlotGame } from "./slotGame.js";
let session = null;
function startGame(canvas) {
  stopGame();
  let disposed = false;
  let app = null;
  let game = null;
  let loadingScreen = null;
  session = {
    dispose: () => {
      disposed = true;
      loadingScreen?.dispose();
      loadingScreen = null;
      delete window.__LOADING_DEBUG__;
      game?.dispose();
      app?.destroy();
      app = null;
      window.__GAME_READY__ = false;
      delete window.__slotDebug;
    }
  };
  void (async () => {
    try {
      window.__GAME_READY__ = false;
      delete window.__GAME_ERROR__;
      app = new Application();
      await app.init({
        canvas,
        resizeTo: canvas.parentElement ?? window,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        antialias: true,
        backgroundAlpha: 0,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
      });
      if (disposed) {
        app.destroy();
        return;
      }
      const spines = new SpineSystem();
      const loadingAtlases = {};
      await Promise.all([
        ensureAtlases(loadingAtlases, ["loading"]),
        loadTexture(assetUrl(deviceAssetPath("mobile/images/loading/loading_bg.png"))),
        spines.ensure(["logo"])
      ]).then(([_, backgroundTexture]) => {
        if (disposed || !app) return;
        loadingScreen = new LoadingScreen(app, backgroundTexture, loadingAtlases.loading, spines);
        window.__LOADING_DEBUG__ = loadingScreen;
      });
      if (disposed || !app || !loadingScreen) return;
      // Preload every mapped sound during the splash so no cue is fetched or
      // decoded for the first time mid-animation; it runs concurrently with
      // the artwork loads below and the same instance is handed to the game.
      const audio = new AudioSystem();
      let atlasProgress = 0;
      let spineProgress = 0;
      let audioProgress = 0;
      const reportProgress = () => {
        loadingScreen?.setProgress(atlasProgress * 45 + spineProgress * 25 + audioProgress * 30);
      };
      const audioReady = audio.preloadAll((loaded, total) => {
        audioProgress = total ? loaded / total : 1;
        reportProgress();
      });
      const atlases = await loadAtlases((loaded, total) => {
        atlasProgress = total ? loaded / total : 1;
        reportProgress();
      });
      atlases.autospins = await loadTexture(assetUrl("shared/basegameui/autospins.png"));
      // The scene-level bottom bushes use the bitmap's full 1920-stage
      // coordinates in the supplied landscape frame. Board-edge bushes set an
      // explicit width below, so their established layout is resolution-independent.
      atlases.bush = await loadTexture(assetUrl(deviceAssetPath("mobile/images/backgrounds/bush.png")), 1);
      Object.assign(atlases, loadingAtlases);
      await loadSpines((loaded, total) => {
        spineProgress = total ? loaded / total : 1;
        reportProgress();
      }, spines);
      // Artwork and every sound cue must be resident before the first round.
      await audioReady;
      loadingScreen.setProgress(100);
      window.__AUDIO_DEBUG__ = audio.debug();
      // No splash tap-to-continue button: the game starts automatically.
      await loadingScreen.waitForContinue();
      if (disposed || !app) return;
      loadingScreen.dispose();
      loadingScreen = null;
      game = new SlotGame(app, atlases, spines, audio);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.__GAME_ERROR__ = message;
      console.error(error);
      if (app && !disposed) {
        if (loadingScreen) {
          loadingScreen.showError(message);
        } else {
          const failure = new Text({
            text: `Unable to load the game.\n${message}`,
            style: new TextStyle({
              fontFamily: "Arial",
              fontSize: 18,
              lineHeight: 25,
              fill: 16777215,
              align: "center",
              wordWrap: true,
              wordWrapWidth: Math.max(280, app.screen.width - 40),
              breakWords: true
            })
          });
          failure.anchor.set(0.5);
          failure.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.addChild(failure);
        }
      }
    }
  })();
}
function stopGame() {
  session?.dispose();
  session = null;
}
export {
  startGame,
  stopGame
};
