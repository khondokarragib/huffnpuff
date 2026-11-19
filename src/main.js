import { startGame } from "./game/boot.js";
import { ASSET_DEVICE } from "./game/atlas.js";

const loadingBackground = new URL(`../assets/${ASSET_DEVICE}/images/loading/loading_bg.png`, import.meta.url).href;
document.getElementById("game-root").style.setProperty("--loading-background", `url("${loadingBackground}")`);

const canvas = document.getElementById("game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Game canvas was not found");
}

await Promise.all([
  document.fonts.load('900 128px "Game Noto Sans"', "FREE SPINS AWARDED 6"),
  document.fonts.load('700 80px "Game Noto Sans"', "PRESS TO START")
]);
startGame(canvas);
