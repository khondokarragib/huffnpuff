# Verifier v4 — desktop landscape control cluster and board scaling

Date: 2026-11-16

Scope: the desktop (non-touch) landscape layout, verified against the user's
uploaded reference frame (`/mnt/agents/upload/images.jpeg`, 728×421) and the
readable original source. All expected values below are computed from the
original configuration, not eyeballed:

- Stage mapping `unit = w / 1920` (same as `layoutSourceBackground`).
- Footer landscape height `b = 75` design units (`RH()` in the original).
- Stake panel: container 305×116, `P(1,1)`, `Eb(0.5,1)`, `ma(-200, -(b+16))`;
  its 305×90 backdrop and children (stake 0.5/0.5, increase 0.8/0.5, decrease
  0.2/0.5 of the backdrop) sit above the footer top edge by 16 design units.
- Autoplay: same right column, bottom-center at `-(b+146)`; artwork 115.
- Turbo: bottom-left `(210, -(b+16))`; artwork 110.
- Menu (burger): bottom-left `(40, -(b+6))`; artwork 100.
- Buy Pass: bottom-left `(40, -(b+146))`; badge artwork ~148 tall.
- Spin: `P(1, 0.5)`, `Eb(0.5, 0.5)`, `ma(-200, 0)`; artwork 240.
- Landscape board width `0.53 × w` (no available-height cap): the original
  scales the stage uniformly by `w/1920`, and at the 728×421 reference aspect
  the board's left edge sits at `(w - 0.53w)/2 ≈ 171` with the lower brickwork
  running behind the footer.

Checks in `controls.cjs`:

1. `short-728x421` — full bounds assertions for board, stake panel, coin
   icon, plus/minus, spin, autoplay, turbo, menu, buy pass (positions and
   sizes derived from the formulas above; ±4 px tolerance at 728×421, ±6 px
   at 1594×898).
2. `desktop-1594x898` — same cluster at the wide reference aspect; board
   width is unchanged by this fix at that aspect (`min(0.53w, …)` did not
   bind there before).
3. `mobile-390x844` — portrait regression: controls stay on the portrait
   branch (visible plus/minus/spin, backdrop positions unchanged), no page
   or console errors.

Footer text rows (also from the 728×421 reference frame): the landscape
meter row (Balance/Win/Bet) sits at 40% of footer height with ~13px glyphs
and the game-name/clock row near the bottom edge with ~8px glyphs; the two
rows must not overlap (they did before this fix).

Each run writes a record to `verifier/runs/`; failures raise the process
exit code. Earlier v1–v3 criteria and records are preserved untouched.
