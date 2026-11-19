# Huff N’ Puff Highrise — PixiJS Reconstruction

A playable HTML5 reconstruction of the supplied Huff N’ Puff Highrise frontend, using original downloaded artwork and audio with new vanilla JavaScript game code. The game uses a virtual balance and runs entirely in the browser.

## Technology

- Plain HTML and CSS
- Vanilla JavaScript ES modules
- PixiJS v8
- Official Spine Pixi v8 runtime
- No React, TypeScript, Vite, compilation, or build step

## Run locally

Serve this directory with any static HTTP server, then open `index.html`. For example:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. The PixiJS and Spine libraries are bundled locally in `vendor.js`; no package installation is required.

## Controls

- **Tap to Continue:** after loading finishes, tap the splash once to enter the base game directly.
- **Spin / Stop:** click the spin button or press **Space**.
- **Autoplay:** choose 10, 25, or 50 spins; use the autoplay control again to cancel.
- **Turbo:** click the turbo control or press **T**.
- **Sound:** click the sound control or press **M**.
- **Pause / Resume:** press **Escape**.
- **Paytable:** open the information screen; scroll or drag to read all pages.
- **Buy Pass:** confirm the feature purchase at the displayed bet-based price.

## Implemented systems

- Five-reel Reel Ways evaluation with 243–7,776 ways as rows unlock.
- Responsive desktop and portrait layouts using the supplied frame atlases.
- Runtime support for all 15 supplied Spine 4.1 asset sets; current gameplay paths load 14, including the logo, background, pigs, hats, symbols, wolf, houses, tally, and big-win rigs. The separate jackpot rig remains unintegrated.
- Virtual wallet, bet selection, win settlement, autoplay, turbo, and quick stop.
- Mystery reveals, Hazard Hard Hat row unlocks, frame progression, houses, and jackpots.
- Normal Saw and Super Saw Free Spins, extra-spin triggers, and feature settlement.
- Original-style paytable with values scaled from the supplied $2-bet screenshots.
- Supplied sound effects and feature music with persistent mute settings.
- Original asset-based loading/splash screen with the animated logo, three rotating game-tip panels, original progress-bar artwork, and a single Tap to Continue transition directly into play.
- Pig 01, Pig 02, and Pig 03 Spine character animations above the reels, plus shared `basegameui` textures for spin/stop, autoplay, Turbo, menu, and bet buttons.
- Critical-first asset loading, bounded concurrency, genuine network retries, and on-demand feature assets.

## Architecture

Gameplay is imperative vanilla JavaScript under `src/game/`. `src/main.js` creates no application framework component tree; it directly starts the game on the HTML canvas. `VirtualCasinoAdapter` currently generates browser-local outcomes and manages the virtual wallet. The platform boundary separates balance and spin-result generation from presentation so a future server-authoritative casino adapter can replace the virtual implementation without rewriting reel choreography.

Useful deterministic preview parameters include `?seed=24680` and `?scenario=win`. Other test scenarios include `hats`, `hazard`, `feature`, `super`, and `busy`.

## Persistence and integration limits

- Balance, selected bet, and mute settings are stored only in the current browser. They do not sync across devices and are lost if browser storage is cleared.
- No account system, payment service, real-money backend, or server-side session persistence is included.
- Original Spine data is played through the official Pixi v8 runtime. Animation placement and sequencing are reconstructed from the compiled frontend and may still differ in fine timing or positioning.
- Local outcome weighting is reconstructed and is not a certified reproduction of the original server math or its documented theoretical RTP.
- Three-symbol Jack and Ten payouts were not visible in the supplied screenshots; the paytable shows `—` and the local game does not invent those values.
