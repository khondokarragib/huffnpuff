# Acceptance criteria v1

Created: 2026-11-15

## Evidence and scope

- Use `/mnt/agents/upload/app.js`, supplied videos/screenshots, and supplied assets as the evidence base. Do not treat visual guesses as confirmed original behavior.
- Preserve the static vanilla-JavaScript/PixiJS application and local virtual-balance adapter. Do not claim certification, server-authoritative RNG, provable fairness, or production casino readiness from browser-only code.
- A visual correction must have an original-source transform/layer/animation reference or a directly comparable supplied reference frame. Record unresolved evidence gaps rather than filling them with invented behavior.

## Focused presentation checks

1. Jackpot captions and values remain inside the intended visible meter cells at desktop reference sizes; no caption or amount intersects a neighboring meter. Capture all four labels, including MAJOR.
2. The wolf uses the original scale/origin and is composited behind the lower blue longitudinal UI artwork, while remaining visible in the intended right-side stage area.
3. The Free Spins trigger tally uses the real fullscreen presentation, remains inside the viewport, and its title/value text is centered on the intended artwork without clipping.
4. Every Mystery reveal stays at the exact originating cell center through idle, reveal, and cleanup. Maximum measured drift: 0.5 CSS pixels after layout conversion.
5. Desktop top background uses the original layer order, source textures, scale, and positioning; compare a matching cold-base frame against the supplied reference.
6. Big Win is foregrounded above board frames, centered, unclipped, and uses the real Spine/text presentation without stray overlays.
7. Desktop board, sign, ways panels, controls, and footer remain aligned after each correction. Real-mobile Safari layout retains the existing no-camera-zoom invariant.

## Engine and regression checks

- Settled visible symbols and logical frames equal the selected outcome.
- Feature tally precedes frame construction; sequential frames, Big Win/final-tally ordering, and expanded-row reset behavior remain correct.
- Reel-triggered and girder-triggered feature entries still work.
- Mystery overlays and temporary frames clean up correctly.
- No uncaught page errors or console errors in the exercised states.
- All established scenarios pass: random, win, hats, hazard, mystery, feature, super, busy.
- JavaScript syntax checks and scoped Git whitespace checks pass.

## Math audit gate

- Document actual symbol weights, feature probabilities, awards, jackpot contribution, and adapter calls before changing math.
- If a 92–93% target model is implemented, report simulation method, sample count, confidence interval, base/feature contribution, and assumptions. A sparse or partially inferred pay model must not be represented as an exact original-game RTP clone.
- Deterministic seeded outcomes remain replayable, and the frontend adapter remains replaceable by a future authoritative outcome provider.

## Required evidence per iteration

- Timestamped verifier run record under `verifier/runs/`, including command, exit code, and produced values.
- Focused desktop/mobile captures and machine-readable measurements for corrected states.
- Any failed check blocks final acceptance until corrected or explicitly identified as an unresolved evidence limitation.
