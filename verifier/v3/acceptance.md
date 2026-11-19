# Verifier v3 acceptance criteria

Created: 2026-11-15

## Source-backed desktop footer composition

- Use the original landscape `Bottom Bar` configuration: Balance, Win, and Bet labels and values are side by side, with meter positions at 20%, 50%, and 80% of the viewport width.
- At the supplied 1594×898 desktop reference size, initial text is exactly `Balance $1,000.00`, `Win`, and `Bet $2.00`; desktop meter strings contain no newline.
- Meter anchors are within 1 CSS pixel of their source-derived horizontal positions and share the blue footer’s vertical center.
- The stacked portrait presentation remains unchanged, including its separate lines and existing 19%, 50%, and 80% horizontal positions.
- Mobile retains the established zero board-camera progress invariant.
- Capture the measured desktop and portrait states. Browser exceptions, console errors, and failed asset requests fail the run.

## Records and scope

- Every execution writes a timestamped record with command, exit code, text values, bounds, positions, and assertions under `verifier/runs/`, including failed pre-correction runs.
- This version adds footer verification only. It does not replace v1 visual criteria or v2 mathematics/sound criteria, and it does not claim pixel identity for unmeasured states.
