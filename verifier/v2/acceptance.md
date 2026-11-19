# Verifier v2 acceptance criteria

## Local demo mathematics

- Measure complete paid base-game rounds, including all resulting Free Spins, retriggers, frame credits, house prizes, and jackpots.
- Use a fixed bet and deterministic seed sequence; preserve the exact sample count and command in every run record.
- Report total measured RTP, a normal-approximation 95% simulation interval, and separate base-ways, feature-ways, feature-frame, house, and jackpot-subset contributions.
- The user-requested local-demo point estimate must fall within 92–93% for the final five-million-round ordinary-paid-round run. A point estimate is not a certified theoretical RTP.
- Simulate at least one million Buy Pass rounds separately using the actual 75% Normal / 25% Super selection, a distinct triggering-spin seed, and a charge of exactly 50× bet.
- Buy Pass returns include the triggering spin's ways and frame credits, every resulting Free Spin and retrigger, row unlocks, house prizes, and jackpots. Its final point estimate must also fall within 92–93%.
- Report ordinary and Buy Pass sample sizes, costs, contribution breakdowns, standard errors, and normal-approximation 95% intervals separately. Jackpot contributions remain subsets of house awards.
- Carry feature row unlocks into subsequent Free Spins and the final house evaluation.
- Preserve the supplied rules' ordinary Brick House range of 7.5×–50×; larger house returns must be named jackpots.
- Do not invent the missing three-symbol Jack/Ten paytable values.
- A girder-trigger outcome preserves landed hats and adds only the difference required to reach six.
- Triggering Saw hats have entry-Saw frame actions; presentation runs them only after the feature tally.
- Identical local-demo seeds reproduce identical outcomes. The browser adapter remains explicitly non-authoritative and replaceable.

## Sound events

- Every supplied local `.webm` file has a mapping; missing mappings or missing local files fail verification.
- Yellow-hat and per-reel scatter cues fire from live reel landing callbacks.
- Straw, Stick, and Brick frame construction use their respective source cues.
- Each house type plays its appearance, blow, and credit-reveal cues.
- Demolition-pig entry, blast background, and each live row explosion have their source cues.
- Super Saw transformation, hat transfer/landing, Saw flip, spinning, and per-reel trail cues occur in the real presentation.
- A 100× Big Win plays tiers 4, 5, 6, and 7 sequentially.
- Wolf arrival plays `WolfJumpDownComplete` alone. Looping wolf music starts only from that cue's natural `ended` event; the unused `WolfJumpDown` variant is not forced into the same event.
- The wolf preview includes enough real house presentations to exercise the 22.94-second arrival-to-music transition naturally.
- Browser errors and failed asset requests fail every sound verification run.

## Records

- Every successful or unsuccessful execution writes a timestamped record under `verifier/runs/`.
- Earlier v1 criteria and records remain unchanged; v2 records do not overwrite them.
