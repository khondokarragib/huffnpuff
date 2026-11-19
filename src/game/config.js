import { SymbolId } from "./types.js";
const INPUT_CONFIG = {
  MOUSE_SENS_X: 26e-4,
  MOUSE_SENS_Y: 22e-4,
  INVERT_X: false,
  INVERT_Y: false
};
const REELS = 5;
const ROWS = 6;
const MIN_ROWS = 3;
const DEFAULT_BET = 2;
const STARTING_BALANCE = 1e3;
const BUY_PASS_MULTIPLIER = 50;
// The source Select Bet page offers 25 stake levels in a 5×5 grid
// (supplied reference screenshot: $0.20 … $20.00).
const BET_LEVELS = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.4, 3, 3.6, 4, 4.8, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20];
const FREE_SPINS_AWARDED = 6;
const PAYTABLE_AT_2 = {
  [SymbolId.Pig1]: { 3: 0.2, 4: 0.8, 5: 3 },
  [SymbolId.Pig2]: { 3: 0.2, 4: 0.5, 5: 2 },
  [SymbolId.Pig3]: { 3: 0.2, 4: 0.4, 5: 1.5 },
  [SymbolId.Toolbox]: { 3: 0.2, 4: 0.4, 5: 1 },
  [SymbolId.Tape]: { 3: 0.1, 4: 0.2, 5: 0.5 },
  [SymbolId.JackHammer]: { 3: 0.1, 4: 0.2, 5: 0.4 },
  [SymbolId.Ace]: { 3: 0.1, 4: 0.2, 5: 0.4 },
  [SymbolId.King]: { 3: 0.1, 4: 0.2, 5: 0.4 },
  [SymbolId.Queen]: { 3: 0.1, 4: 0.2, 5: 0.4 },
  // The supplied screenshots show only four- and five-symbol awards for Jack/Ten.
  [SymbolId.Jack]: { 4: 0.1, 5: 0.2 },
  [SymbolId.Ten]: { 4: 0.1, 5: 0.2 }
};
const SYMBOL_NAMES = {
  [SymbolId.Wolf]: "WILD",
  [SymbolId.Pig1]: "PIGGY1",
  [SymbolId.Pig2]: "PIGGY2",
  [SymbolId.Pig3]: "PIGGY3",
  [SymbolId.Toolbox]: "TOOLBOX",
  [SymbolId.Tape]: "TAPE",
  [SymbolId.JackHammer]: "JACKHAMMER",
  [SymbolId.Ace]: "ACE",
  [SymbolId.King]: "KING",
  [SymbolId.Queen]: "QUEEN",
  [SymbolId.Jack]: "JACK",
  [SymbolId.Ten]: "TEN"
};
const JACKPOTS = [
  { label: "GRAND", multiplier: 5e3, color: 16735031 },
  { label: "MAJOR", multiplier: 1e3, color: 3582463 },
  { label: "MINOR", multiplier: 100, color: 3468930 },
  { label: "MINI", multiplier: 20, color: 15887615 }
];
const TIMING = {
  spinMinimum: 500,
  reelStagger: 300,
  turboSpinMinimum: 260,
  turboReelStagger: 65,
  resultHold: 900,
  featureBanner: 1800
};
const money = (value) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export {
  BET_LEVELS,
  BUY_PASS_MULTIPLIER,
  DEFAULT_BET,
  FREE_SPINS_AWARDED,
  INPUT_CONFIG,
  JACKPOTS,
  MIN_ROWS,
  PAYTABLE_AT_2,
  REELS,
  ROWS,
  STARTING_BALANCE,
  SYMBOL_NAMES,
  TIMING,
  money
};
