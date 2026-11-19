import { FREE_SPINS_AWARDED, PAYTABLE_AT_2, REELS, ROWS } from "./config.js";
import { Rng } from "./rng.js";
import {
  SymbolId
} from "./types.js";
const REGULAR_SYMBOLS = [
  SymbolId.Pig1,
  SymbolId.Pig2,
  SymbolId.Pig3,
  SymbolId.Toolbox,
  SymbolId.Tape,
  SymbolId.JackHammer,
  SymbolId.Ace,
  SymbolId.King,
  SymbolId.Queen,
  SymbolId.Jack,
  SymbolId.Ten
];
const HATS = [SymbolId.Scatter, SymbolId.ScatterA, SymbolId.ScatterB, SymbolId.ScatterC, SymbolId.ScatterD];
const isHat = (symbol) => HATS.includes(symbol);
const isPaySymbol = (symbol) => REGULAR_SYMBOLS.includes(symbol);
// User-requested 92–93% local-demo variant. These probabilities are not
// recovered from the original server and must not be presented as its math.
// They are calibrated together (Monte-Carlo over the full spin→feature→house
// cycle) so the measured return-to-player lands in the 92–93% band, mirroring
// how a real slot fixes its reel strips and feature frequency to a target RTP.
const DEMO_PROBABILITIES = ({
  featureBelow: 0.004,
  superBelow: 0.0025,
  girderFeature: 0.004,
  baseHazard: 0.03,
  baseHats: 0.14,
  featureHats: 0.35,
  // Calibration dial for the local-demo house awards below: scales every
  // end-of-feature house credit (including jackpots) so the measured full-cycle
  // RTP lands in the 92–93% band. A real deployment replaces this whole block
  // with server-authoritative math; nothing here reproduces certified payouts.
  housePrizeScale: 1.07
});
// Reel-strip calibration. The wild (Wolf) density on the non-lead reels and the
// Mystery density are the primary base-game RTP dials; together with the
// feature frequency and house-prize table below they are tuned so the full
// cycle measures 92–93% (see the full-cycle RTP harness).
const REEL_MATH = {
  // Wolf substitutes on reels 2–5 (0-indexed 1–4); it never leads a way.
  wildReels: [1, 2, 3, 4],
  wildProbability: 0.1,
  mysteryProbability: 0.07
};
const emptyFrames = () => Array.from({ length: REELS }, () => Array(ROWS).fill(0));
function emptyGrid() {
  return Array.from({ length: REELS }, () => Array(ROWS).fill(SymbolId.Ten));
}
function randomRegular(rng, reel, mode) {
  const roll = rng.next();
  if (REEL_MATH.wildReels.includes(reel) && roll < REEL_MATH.wildProbability) return SymbolId.Wolf;
  if (roll < REEL_MATH.wildProbability + REEL_MATH.mysteryProbability) return SymbolId.Mystery;
  // Even mix across the full symbol set: the board should show pigs, tools
  // and royals alike instead of being flooded by the letter symbols. Every
  // cell shown is still the outcome selected here — only the mix changed.
  const weighted = [
    SymbolId.Pig1,
    SymbolId.Pig1,
    SymbolId.Pig1,
    SymbolId.Pig2,
    SymbolId.Pig2,
    SymbolId.Pig2,
    SymbolId.Pig3,
    SymbolId.Pig3,
    SymbolId.Pig3,
    SymbolId.Toolbox,
    SymbolId.Toolbox,
    SymbolId.Toolbox,
    SymbolId.Tape,
    SymbolId.Tape,
    SymbolId.Tape,
    SymbolId.JackHammer,
    SymbolId.JackHammer,
    SymbolId.JackHammer,
    SymbolId.Ace,
    SymbolId.Ace,
    SymbolId.Ace,
    SymbolId.King,
    SymbolId.King,
    SymbolId.King,
    SymbolId.Queen,
    SymbolId.Queen,
    SymbolId.Queen,
    SymbolId.Jack,
    SymbolId.Jack,
    SymbolId.Jack,
    SymbolId.Ten,
    SymbolId.Ten,
    SymbolId.Ten
  ];
  return rng.pick(weighted);
}
function activePositions(activeRows) {
  const positions = [];
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = ROWS - activeRows; row < ROWS; row++) positions.push({ reel, row });
  }
  return positions;
}
function sawAction(source, direction, activeRows) {
  const targets = [];
  if (direction === "L") {
    for (let reel = source.reel - 1; reel >= 0; reel--) targets.push({ reel, row: source.row });
  } else if (direction === "R") {
    for (let reel = source.reel + 1; reel < REELS; reel++) targets.push({ reel, row: source.row });
  } else if (direction === "U") {
    for (let row = source.row - 1; row >= ROWS - activeRows; row--) targets.push({ reel: source.reel, row });
  } else if (direction === "D") {
    for (let row = source.row + 1; row < ROWS; row++) targets.push({ reel: source.reel, row });
  }
  return { source: { ...source }, targets, direction };
}
function createSawActions(grid, hats, activeRows, rng) {
  const actions = [];
  for (const position of hats) {
    const symbol = grid[position.reel][position.row];
    const directions = symbol === SymbolId.ScatterA ? ["L", "R"] : symbol === SymbolId.ScatterB ? ["U", "D"] : [];
    // Direction is supplied by SAW_A/SAW_B in the original response. The virtual
    // adapter must choose demo data; this choice is not recovered server logic.
    if (directions.length) actions.push(sawAction(position, rng.pick(directions), activeRows));
  }
  return actions;
}
function createSuperSawActions(hats, activeRows, rng, sawActions) {
  // Local Super-trigger replacement data. Production adapters must instead map
  // the authoritative response's source/direction actions without redraws.
  // Hats that already landed as saws keep their supplied axis and direction;
  // only ordinary, Hazard and Super Saw hats are converted by the feature.
  return hats.map((position) => {
    const existing = sawActions.find((action) => action.source.reel === position.reel && action.source.row === position.row);
    return existing || sawAction(position, rng.pick(["L", "R", "U", "D"]), activeRows);
  });
}
function placeHats(grid, rng, activeRows, count, superSaw = false, mode = "base") {
  // Additional girders must preserve hats that have already landed.
  const positions = rng.shuffle(activePositions(activeRows).filter((p) => !isHat(grid[p.reel][p.row])));
  const hats = [];
  let hasWhiteHat = grid.some((column) => column.includes(SymbolId.ScatterC));
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const pos = positions[i];
    const roll = rng.next();
    let symbol = SymbolId.Scatter;
    // In either feature, saw and Hazard hats land only on reels 1, 3 and 5.
    // The base game additionally allows placed saw hats outside those reels.
    const sawAllowed = mode === "base" ? pos.reel !== 3 : [0, 2, 4].includes(pos.reel);
    if (roll < 0.18 && sawAllowed) symbol = SymbolId.ScatterA;
    else if (roll < 0.36 && sawAllowed) symbol = SymbolId.ScatterB;
    else if (roll < 0.44 && !hasWhiteHat && [0, 2, 4].includes(pos.reel)) symbol = SymbolId.ScatterC;
    grid[pos.reel][pos.row] = symbol;
    if (symbol === SymbolId.ScatterC) hasWhiteHat = true;
    hats.push(pos);
  }
  if (superSaw && hats.length) {
    const pos = rng.pick(hats);
    grid[pos.reel][pos.row] = SymbolId.ScatterD;
  }
  return hats;
}
function forceWin(grid, activeRows) {
  const row = ROWS - 1;
  for (let reel = 0; reel < REELS; reel++) grid[reel][row] = reel === 3 ? SymbolId.Wolf : SymbolId.Pig1;
  grid[0][row - 1] = SymbolId.Pig1;
  grid[2][row - 1] = SymbolId.Pig1;
  if (activeRows < 3) grid[0][row] = SymbolId.Pig1;
}
function generateSpin(request) {
  const rng = new Rng(request.seed);
  const grid = emptyGrid();
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) grid[reel][row] = randomRegular(rng, reel, request.mode);
  }
  let scenario = request.scenario;
  if (scenario === "mystery") {
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = 0; row < ROWS; row++) if (grid[reel][row] === SymbolId.Mystery) grid[reel][row] = SymbolId.Pig1;
    }
    for (const position of rng.shuffle(activePositions(request.activeRows)).slice(0, 6)) {
      grid[position.reel][position.row] = SymbolId.Mystery;
    }
  }
  const mysteryPositions = [];
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[reel][row] === SymbolId.Mystery) mysteryPositions.push({ reel, row });
    }
  }
  const mysteryReveal = scenario === "mystery" ? SymbolId.Scatter : rng.pick([SymbolId.Pig1, SymbolId.Pig2, SymbolId.Pig3, SymbolId.Toolbox, SymbolId.Tape]);
  const initialGrid = grid.map((column) => [...column]);
  for (const position of mysteryPositions) grid[position.reel][position.row] = mysteryReveal;
  if (scenario === "random") {
    const featureRoll = rng.next();
    if (request.mode === "base" && featureRoll < DEMO_PROBABILITIES.superBelow) scenario = "super";
    else if (request.mode === "base" && featureRoll < DEMO_PROBABILITIES.superBelow + DEMO_PROBABILITIES.featureBelow) scenario = "feature";
    else if (request.mode === "base" && featureRoll < DEMO_PROBABILITIES.superBelow + DEMO_PROBABILITIES.featureBelow + DEMO_PROBABILITIES.baseHazard) scenario = "hazard";
    else if (request.mode === "base" && rng.chance(DEMO_PROBABILITIES.girderFeature)) scenario = "girder";
    else if (rng.chance(request.mode === "base" ? DEMO_PROBABILITIES.baseHats : DEMO_PROBABILITIES.featureHats)) scenario = "hats";
  }
  let girder = false;
  let girderType = null;
  const thrownHats = [];
  if (scenario === "win") forceWin(grid, request.activeRows);
  if (scenario === "hazard") {
    // A single Hazard hat supplies the row unlock; additional white hats are
    // not part of the requested outcome presentation.
    grid[0][ROWS - 1] = SymbolId.ScatterC;
  } else if (scenario === "feature") {
    placeHats(grid, rng, request.activeRows, 6, false, request.mode);
  } else if (scenario === "super") {
    // The green Super Saw hat only enters through girder placement. Five
    // ordinary scatters land first; the girder then supplies the green sixth.
    placeHats(grid, rng, request.activeRows, 5, false, request.mode);
  } else if (scenario === "girder") {
    placeHats(grid, rng, request.activeRows, rng.int(1, 5), false, request.mode);
  } else if (scenario === "hats") {
    const count = request.mode === "base" ? rng.int(1, 5) : rng.int(1, 4);
    placeHats(grid, rng, request.activeRows, count, false, request.mode);
  } else if (scenario === "busy") {
    forceWin(grid, request.activeRows);
    placeHats(grid, rng, request.activeRows, 8, true);
  }
  let hats = activePositions(request.activeRows).filter((p) => isHat(grid[p.reel][p.row]));
  if (request.mode === "base" && (scenario === "super" || scenario === "girder")) {
    // The Super Saw entry supplies its green sixth hat through the girder.
    // The local girder-trigger scenario likewise preserves 1–5 landed hats
    // and supplies only the difference needed to reach six.
    const preThrowGrid = grid.map((column) => [...column]);
    const added = placeHats(grid, rng, request.activeRows, Math.max(1, 6 - hats.length), scenario === "super", request.mode);
    for (const position of added) {
      thrownHats.push({
        position: { ...position },
        symbol: grid[position.reel][position.row],
        underlying: preThrowGrid[position.reel][position.row]
      });
    }
    hats = activePositions(request.activeRows).filter((p) => isHat(grid[p.reel][p.row]));
    girder = true;
    girderType = "THROW";
  } else if (request.mode === "base" && scenario === "mystery") {
    girder = true;
    girderType = "SPIN";
  }
  const hasHazard = hats.some((p) => grid[p.reel][p.row] === SymbolId.ScatterC);
  const unlockedRows = hasHazard && request.activeRows < ROWS ? Math.min(rng.int(1, 3), ROWS - request.activeRows) : 0;
  const activeRowsAfter = request.activeRows + unlockedRows;
  const wins = evaluateWays(grid, activeRowsAfter, request.bet);
  const waysWin = wins.reduce((sum, win) => sum + win.amount, 0);
  let feature = "none";
  if (request.mode === "base" && hats.length >= FREE_SPINS_AWARDED) {
    feature = hats.some((p) => grid[p.reel][p.row] === SymbolId.ScatterD) ? "super" : "normal";
  }
  // Super Saw retriggers count Saw and Hazard hats only; ordinary Hard Hats
  // still retrigger the regular Free Spins feature.
  const retriggerHats = request.mode === "super"
    ? hats.filter((position) => [SymbolId.ScatterA, SymbolId.ScatterB, SymbolId.ScatterC].includes(grid[position.reel][position.row]))
    : hats;
  const extraSpin = request.mode !== "base" && retriggerHats.length >= 3;
  const sawActions = createSawActions(grid, hats, activeRowsAfter, rng);
  const superSawActions = feature === "super" ? createSuperSawActions(hats, activeRowsAfter, rng, sawActions) : [];
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      const wasRevealedMystery = initialGrid[reel][row] === SymbolId.Mystery && grid[reel][row] === mysteryReveal;
      if (!wasRevealedMystery) initialGrid[reel][row] = grid[reel][row];
    }
  }
  for (const thrown of thrownHats) {
    initialGrid[thrown.position.reel][thrown.position.row] = thrown.underlying;
  }
  const triggerGrid = grid.map((column) => [...column]);
  const framePlan = createFramePlan(request, rng, grid, triggerGrid, hats, feature, sawActions, superSawActions, activeRowsAfter);
  return {
    grid: initialGrid,
    finalGrid: grid,
    triggerGrid,
    mysteryPositions,
    mysteryReveal,
    activeRowsBefore: request.activeRows,
    activeRowsAfter,
    unlockedRows,
    hats,
    wins,
    waysWin: Math.round(waysWin * 100) / 100,
    feature,
    extraSpin,
    girder,
    girderType,
    thrownHats,
    sawActions,
    superSawActions,
    frameActions: framePlan.frameActions,
    framesAfter: framePlan.framesAfter,
    frameCredit: framePlan.frameCredit,
    specialPositions: girderType === "SPIN" ? mysteryPositions.map((position) => ({
      position: { ...position },
      symbol: grid[position.reel][position.row]
    })) : []
  };
}
function evaluateWays(grid, activeRows, bet) {
  const wins = [];
  const firstRow = ROWS - activeRows;
  for (const symbol of REGULAR_SYMBOLS) {
    const positions = [];
    let ways = 1;
    let length = 0;
    for (let reel = 0; reel < REELS; reel++) {
      const matches = [];
      for (let row = firstRow; row < ROWS; row++) {
        const current = grid[reel][row];
        if (current === symbol || reel > 0 && current === SymbolId.Wolf) matches.push({ reel, row });
      }
      if (!matches.length) break;
      length++;
      ways *= matches.length;
      positions.push(...matches);
    }
    if (length < 3) continue;
    const atTwo = PAYTABLE_AT_2[symbol]?.[length];
    if (atTwo === void 0) continue;
    wins.push({
      symbol,
      length,
      ways,
      amount: Math.round(atTwo * (bet / 2) * ways * 100) / 100,
      positions
    });
  }
  return wins.sort((a, b) => b.amount - a.amount);
}
function upgradeFrame(frames, position, activeRows, rng) {
  const current = frames[position.reel][position.row];
  if (current < 3) {
    frames[position.reel][position.row] = current + 1;
    return { creditMultiplier: 0, redirected: null, fromLevel: current, toLevel: current + 1 };
  }
  const candidates = activePositions(activeRows);
  const priority = [2, 1, 0];
  let target = null;
  for (const level of priority) {
    const matches = candidates.filter((p) => frames[p.reel][p.row] === level);
    if (matches.length) {
      target = rng.pick(matches);
      break;
    }
  }
  if (target) {
    const fromLevel = frames[target.reel][target.row];
    frames[target.reel][target.row] = fromLevel + 1;
    return { creditMultiplier: 0, redirected: target, fromLevel, toLevel: fromLevel + 1 };
  }
  return { creditMultiplier: 10, redirected: null, fromLevel: 3, toLevel: 3 };
}
function sawIsAllBrick(frames, action, activeRows) {
  const { source, direction } = action;
  if (direction === "L" || direction === "R") {
    for (let reel = 0; reel < REELS; reel++) if (frames[reel][source.row] !== 3) return false;
    return true;
  }
  const firstRow = ROWS - activeRows;
  for (let row = firstRow; row < ROWS; row++) if (frames[source.reel][row] !== 3) return false;
  return true;
}
function createFramePlan(request, rng, finalGrid, triggerGrid, hats, feature, sawActions, superSawActions, activeRows) {
  const frames = request.frames.map((column) => [...column]);
  const frameActions = [];
  let frameCredit = 0;
  const featureTrigger = request.mode === "base" && feature !== "none";
  const superTrigger = featureTrigger && feature === "super" && hats.some((position) => triggerGrid[position.reel][position.row] === SymbolId.ScatterD);
  const applyUpgrade = (source, kind, crossed = source) => {
    // A saw upgrades each cell it travels ACROSS (one frame per crossed cell,
    // in path order) — never the source symbol repeatedly. Hats pass
    // crossed === source, so their own cell still upgrades as before.
    const upgraded = upgradeFrame(frames, crossed, activeRows, rng);
    const target = upgraded.redirected || crossed;
    const credit = Math.round(upgraded.creditMultiplier * request.bet * 100) / 100;
    frameCredit += credit;
    frameActions.push({
      kind,
      source: { ...source },
      crossed: { ...crossed },
      target: { ...target },
      fromLevel: upgraded.fromLevel,
      toLevel: upgraded.toLevel,
      credit
    });
  };
  for (const position of hats) {
    const symbol = triggerGrid[position.reel][position.row];
    if (featureTrigger) {
      // Free Spins entry establishes Straw Frames only. Saw movement and all
      // further upgrades require later hat/saw actions inside the feature;
      // nothing may jump to Stick or Brick merely because the feature triggered.
      const fromLevel = frames[position.reel][position.row];
      const toLevel = Math.max(1, fromLevel);
      frames[position.reel][position.row] = toLevel;
      frameActions.push({
        kind: "hat",
        source: { ...position },
        crossed: { ...position },
        target: { ...position },
        fromLevel,
        toLevel,
        credit: 0
      });
      continue;
    }
    const saw = symbol === SymbolId.ScatterA || symbol === SymbolId.ScatterB || symbol === SymbolId.ScatterD;
    if (request.mode !== "base" && saw) continue;
    applyUpgrade(position, "hat");
  }
  // Triggering saws also run before the first Free Spin. Presentation delays
  // them until after the tally, but their supplied frame plan is built here.
  const actions = superTrigger ? superSawActions : sawActions;
  const concurrent = superTrigger || request.mode === "super";
  const applySawTargets = (action) => {
    if (action.skip) return;
    for (const target of action.targets) applyUpgrade(action.source, "saw", target);
  };
  if (concurrent) {
    for (const action of actions) action.skip = sawIsAllBrick(frames, action, activeRows);
    for (const action of actions) applySawTargets(action);
  } else {
    for (const action of actions) {
      action.skip = sawIsAllBrick(frames, action, activeRows);
      applySawTargets(action);
    }
  }
  if (superTrigger) {
    for (const action of superSawActions) {
      const { source, direction } = action;
      finalGrid[source.reel][source.row] = direction === "U" || direction === "D" ? SymbolId.ScatterB : SymbolId.ScatterA;
    }
  }
  for (const action of actions) {
    if (action.skip) finalGrid[action.source.reel][action.source.row] = SymbolId.Scatter;
    action.finalSourceSymbol = finalGrid[action.source.reel][action.source.row];
  }
  return {
    frameActions,
    framesAfter: frames,
    frameCredit: Math.round(frameCredit * 100) / 100
  };
}
function generateBuyPass(request) {
  const rng = new Rng(request.seed);
  return { scenario: rng.chance(0.25) ? "super" : "normal" };
}
function generateFeatureEnd(request) {
  const rng = new Rng(request.seed);
  const positions = [];
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = ROWS - request.activeRows; row < ROWS; row++) {
      if (request.frames[reel][row] > 0) positions.push({ reel, row });
    }
  }
  positions.sort((a, b) => a.reel - b.reel);
  positions.sort((a, b) => request.frames[a.reel][a.row] - request.frames[b.reel][b.row]);
  const awards = positions.map((position) => awardHouse(position, request.frames[position.reel][position.row], request.bet, rng));
  return {
    awards,
    total: Math.round(awards.reduce((sum, award) => sum + award.amount, 0) * 100) / 100
  };
}
function awardHouse(position, frame, bet, rng) {
  let multiplier = 1;
  let jackpot = null;
  if (frame === 1) multiplier = rng.pick([0.5, 0.75, 1]);
  else if (frame === 2) multiplier = rng.pick([1.5, 2, 2.5, 3, 3.5, 4, 4.5]);
  else {
    const roll = rng.next();
    // Local-demo weights only; the supplied client does not disclose the
    // original server's house-prize probabilities.
    if (roll < 1e-4) {
      jackpot = "GRAND";
      multiplier = 5e3;
    } else if (roll < 5e-4) {
      jackpot = "MAJOR";
      multiplier = 1e3;
    } else if (roll < 3e-3) {
      jackpot = "MINOR";
      multiplier = 100;
    } else if (roll < 9e-3) {
      jackpot = "MINI X2";
      multiplier = 40;
    } else if (roll < 0.025) {
      jackpot = "MINI";
      multiplier = 20;
    } else {
      // Supplied HOUSE PRIZES rules: ordinary Brick House credit prizes span
      // 7.5×–50×. Larger returns exist only through the named jackpot awards.
      // Integer weights 42:2:1:1:1:1:1:1:1 (51 total) are a local-demo choice.
      const creditRoll = rng.next();
      if (creditRoll < 42 / 51) multiplier = 7.5;
      else if (creditRoll < 44 / 51) multiplier = 10;
      else if (creditRoll < 45 / 51) multiplier = 12.5;
      else if (creditRoll < 46 / 51) multiplier = 15;
      else if (creditRoll < 47 / 51) multiplier = 20;
      else if (creditRoll < 48 / 51) multiplier = 25;
      else if (creditRoll < 49 / 51) multiplier = 30;
      else if (creditRoll < 50 / 51) multiplier = 40;
      else multiplier = 50;
    }
  }
  return { position, frame, multiplier, jackpot, amount: Math.round(multiplier * bet * DEMO_PROBABILITIES.housePrizeScale * 100) / 100 };
}
export {
  DEMO_PROBABILITIES,
  awardHouse,
  emptyFrames,
  evaluateWays,
  generateBuyPass,
  generateFeatureEnd,
  generateSpin,
  isHat,
  isPaySymbol,
  sawAction,
  upgradeFrame
};
