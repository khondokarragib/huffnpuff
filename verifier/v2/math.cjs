#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const rounds = Math.max(1, Number(process.argv[2]) || 250000);
const buyPassRounds = Math.max(1, Number(process.argv[3]) || Math.min(rounds, 1000000));
const bet = 2;
const BUY_PASS_COST_BETS = 50;
const startedAt = new Date().toISOString();

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const math = await import(pathToFileURL(path.join(root, "src/game/gameMath.js")));
  const { Rng } = await import(pathToFileURL(path.join(root, "src/game/rng.js")));
  const { BUY_PASS_MULTIPLIER, PAYTABLE_AT_2, REELS } = await import(pathToFileURL(path.join(root, "src/game/config.js")));
  const { SymbolId } = await import(pathToFileURL(path.join(root, "src/game/types.js")));
  const {
    DEMO_PROBABILITIES,
    awardHouse,
    emptyFrames,
    generateBuyPass,
    generateFeatureEnd,
    generateSpin
  } = math;

  function accumulator() {
    return {
      totals: {
        baseWays: 0,
        baseFrames: 0,
        featureWays: 0,
        featureFrames: 0,
        houses: 0,
        jackpots: 0
      },
      jackpotCounts: { GRAND: 0, MAJOR: 0, MINOR: 0, "MINI X2": 0, MINI: 0 },
      features: { normal: 0, super: 0, girderEntries: 0, freeSpins: 0 },
      invalidBrickAwards: 0,
      featureMismatches: 0
    };
  }

  function simulatePaidTrigger(seed, scenario, expectedFeature, sample) {
    const base = generateSpin({
      seed,
      bet,
      mode: "base",
      activeRows: 3,
      frames: emptyFrames(),
      scenario
    });
    let roundWin = base.waysWin + base.frameCredit;
    sample.totals.baseWays += base.waysWin;
    sample.totals.baseFrames += base.frameCredit;

    if (expectedFeature && base.feature !== expectedFeature) sample.featureMismatches++;
    if (base.feature === "none") return roundWin;

    sample.features[base.feature]++;
    if (base.girderType === "THROW") sample.features.girderEntries++;
    let remaining = 6;
    let spinIndex = 0;
    let frames = base.framesAfter;
    let activeRows = base.activeRowsAfter;

    while (remaining > 0) {
      remaining--;
      spinIndex++;
      sample.features.freeSpins++;
      const result = generateSpin({
        seed: (seed + spinIndex * 7919) >>> 0,
        bet,
        mode: base.feature,
        activeRows,
        frames,
        scenario: "random"
      });
      frames = result.framesAfter;
      activeRows = result.activeRowsAfter;
      sample.totals.featureWays += result.waysWin;
      sample.totals.featureFrames += result.frameCredit;
      roundWin += result.waysWin + result.frameCredit;
      if (result.extraSpin) remaining++;

      if (remaining === 0) {
        const ending = generateFeatureEnd({
          seed: (seed + (spinIndex + 1) * 7919) >>> 0,
          bet,
          frames,
          activeRows
        });
        sample.totals.houses += ending.total;
        roundWin += ending.total;
        for (const award of ending.awards) {
          if (award.jackpot) {
            sample.jackpotCounts[award.jackpot]++;
            sample.totals.jackpots += award.amount;
          } else if (award.frame === 3 && (award.multiplier < 7.5 || award.multiplier > 50)) {
            sample.invalidBrickAwards++;
          }
        }
      }
    }
    return roundWin;
  }

  function summarize(sample, roundReturns, count, cost) {
    const wager = count * cost;
    // Jackpot contribution is a subset of houses, never an extra payout.
    const totalWin = Object.values(sample.totals).reduce((sum, value) => sum + value, 0) - sample.totals.jackpots;
    const mean = roundReturns.reduce((sum, value) => sum + value, 0) / count;
    const variance = roundReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, count - 1);
    const standardError = Math.sqrt(variance / count);
    const rtpPercent = 100 * totalWin / wager;
    return {
      sample: { rounds: count, bet, cost, wager, ...sample.features },
      measuredRtpPercent: rtpPercent,
      meanReturnPerCost: mean,
      sampleStandardDeviationPerCost: Math.sqrt(variance),
      standardErrorPercent: 100 * standardError,
      normalApproximationCi95Percent: [rtpPercent - 196 * standardError, rtpPercent + 196 * standardError],
      contributionsPercent: Object.fromEntries(Object.entries(sample.totals).map(([key, value]) => [key, 100 * value / wager])),
      jackpotCounts: sample.jackpotCounts,
      invalidBrickAwards: sample.invalidBrickAwards,
      featureMismatches: sample.featureMismatches
    };
  }

  const ordinary = accumulator();
  const ordinaryReturns = new Float64Array(rounds);
  for (let index = 0; index < rounds; index++) {
    const seed = Math.imul(index + 1, 2654435761) >>> 0;
    const roundWin = simulatePaidTrigger(seed, "random", null, ordinary);
    ordinaryReturns[index] = roundWin / bet;
  }
  const ordinaryReport = summarize(ordinary, ordinaryReturns, rounds, bet);

  const buyPass = accumulator();
  const buyPassReturns = new Float64Array(buyPassRounds);
  const buyPassCost = bet * BUY_PASS_COST_BETS;
  for (let index = 0; index < buyPassRounds; index++) {
    // Production consumes one provider seed for the 75%/25% selection and a
    // second seed for the triggering spin. These fixed streams reproduce that
    // separation without sharing the selection RNG with the reel outcome.
    const selectionSeed = Math.imul(index + 1, 2246822519) >>> 0;
    const spinSeed = Math.imul(index + 1, 2654435761) >>> 0;
    const selection = generateBuyPass({ seed: selectionSeed });
    const scenario = selection.scenario === "super" ? "super" : "feature";
    const roundWin = simulatePaidTrigger(spinSeed, scenario, selection.scenario, buyPass);
    buyPassReturns[index] = roundWin / buyPassCost;
  }
  const buyPassReport = summarize(buyPass, buyPassReturns, buyPassRounds, buyPassCost);

  const deterministicA = generateSpin({ seed: 123456789, bet, mode: "base", activeRows: 3, frames: emptyFrames(), scenario: "random" });
  const deterministicB = generateSpin({ seed: 123456789, bet, mode: "base", activeRows: 3, frames: emptyFrames(), scenario: "random" });
  const girder = generateSpin({ seed: 987654321, bet, mode: "base", activeRows: 3, frames: emptyFrames(), scenario: "girder" });
  const entry = generateSpin({ seed: 192837465, bet, mode: "base", activeRows: 3, frames: emptyFrames(), scenario: "busy" });
  const rng = new Rng(246813579);
  const sampledBrickAwards = Array.from({ length: 10000 }, (_, index) => awardHouse({ reel: index % REELS, row: 5 }, 3, bet, rng));
  const invalidSampledBrickAwards = sampledBrickAwards.filter((award) => !award.jackpot && (award.multiplier < 7.5 || award.multiplier > 50));

  const checks = {
    "measured-local-rtp-within-92-93": ordinaryReport.measuredRtpPercent >= 92 && ordinaryReport.measuredRtpPercent <= 93,
    "measured-buy-pass-rtp-within-92-93": buyPassReport.measuredRtpPercent >= 92 && buyPassReport.measuredRtpPercent <= 93,
    "buy-pass-charges-50-times-bet": BUY_PASS_MULTIPLIER === BUY_PASS_COST_BETS && buyPassCost === bet * 50,
    "buy-pass-selection-matches-triggered-feature": buyPass.featureMismatches === 0,
    "no-undocumented-ordinary-brick-awards": ordinary.invalidBrickAwards === 0 && buyPass.invalidBrickAwards === 0 && invalidSampledBrickAwards.length === 0,
    "same-seed-reproduces-local-demo-outcome": JSON.stringify(deterministicA) === JSON.stringify(deterministicB),
    "girder-preserves-landed-hats-and-supplies-difference": girder.hats.length === 6 && girder.thrownHats.length >= 1 && girder.thrownHats.length <= 5 && girder.feature === "normal",
    "triggering-saws-have-entry-frame-actions": entry.frameActions.some((action) => action.kind === "saw"),
    "missing-jack-ten-three-symbol-values-not-invented": PAYTABLE_AT_2[SymbolId.Jack][3] === undefined && PAYTABLE_AT_2[SymbolId.Ten][3] === undefined
  };

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    command: `node verifier/v2/math.cjs ${rounds} ${buyPassRounds}`,
    status: Object.values(checks).every(Boolean) ? "pass" : "fail",
    model: "user-requested local virtual-demo variant; not recovered original server mathematics",
    configuredTargetPercent: [92, 93],
    suppliedRulesPublishedRtpPercent: 96,
    ordinary: ordinaryReport,
    buyPass: {
      ...buyPassReport,
      selection: { normal: 0.75, super: 0.25 },
      includes: "50x-bet charge, triggering-spin ways and frame credits, all Free Spins, retriggers, houses and jackpots"
    },
    // Preserve the original top-level ordinary-round fields for run consumers.
    sample: { paidBaseRounds: rounds, bet, wager: rounds * bet, ...ordinary.features },
    measuredRtpPercent: ordinaryReport.measuredRtpPercent,
    meanReturnPerBet: ordinaryReport.meanReturnPerCost,
    sampleStandardDeviationPerBet: ordinaryReport.sampleStandardDeviationPerCost,
    standardErrorPercent: ordinaryReport.standardErrorPercent,
    normalApproximationCi95Percent: ordinaryReport.normalApproximationCi95Percent,
    contributionsPercent: ordinaryReport.contributionsPercent,
    jackpotCounts: ordinaryReport.jackpotCounts,
    checks,
    probabilities: DEMO_PROBABILITIES,
    evidenceGaps: [
      "Original server reel strips, weights, feature frequencies and house-prize probabilities were not supplied.",
      "Three-symbol Jack and Ten awards are absent from the supplied visible paytable evidence and remain unpaid rather than invented.",
      "The confidence interval is a simulation uncertainty estimate, not a certification or proof of theoretical RTP.",
      "The local seeded adapter is browser-side and is not server-authoritative or provably fair."
    ]
  };
  const directory = path.join(root, "verifier/runs");
  fs.mkdirSync(directory, { recursive: true });
  const output = path.join(directory, `${timestamp()}-math-v2.json`);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ output, ...report }, null, 2));
  if (report.status !== "pass") process.exitCode = 1;
}

main().catch((error) => {
  const output = path.join(root, "verifier/runs", `${timestamp()}-math-v2.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), status: "fail", error: error.stack }, null, 2) + "\n");
  console.error(error);
  process.exitCode = 1;
});
