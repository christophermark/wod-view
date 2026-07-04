# 08 — Deep-cuts backlog

One-paragraph specs for the rest of the research catalog. Promote any of
these to a numbered doc when its dependencies exist and appetite strikes.

## Notes search _(S, no deps — promotable any time)_

Full-text search over notes + descriptions from the log tab's header.
Pure `searchWorkouts(list, query)` (case-insensitive, token AND-match) in
`src/lib/workouts.ts`; results reuse the log row component. 281/354 workouts
have notes; today they're write-only.

## Rx rate by movement _(S, needs 03)_

For each movement: Rx% of workouts containing it vs. overall Rx rate, only
where sample ≥ 8 workouts. Output: "You scale 70% of double-under workouts"
— a skill-practice to-do list from your own history. Card on stats screen,
worst three offenders.

## Interval fade analysis _(S, no deps)_

163 sets are `{mins,secs}` and multi-set workouts carry per-round splits.
For those workouts, compute fade = (last − first) / first and split
variance; render splits as bars on the workout detail with a "FADE +38%"
caption. Watching fade shrink over months is pacing skill made visible.

## Volume odometer _(M, needs 03)_

Lifetime `≈` totals per signature movement ("≈12,000 wall balls"), the
numbers that only go up. Stats-screen card cycling the top few + a full
list screen. Strictly estimates — always `≈`-labeled, `null`-reps workouts
skipped.

## Programming fingerprint _(M, needs 03)_

Classify each workout by time domain (<5, 5–10, 11–20, 20+ min — from
score when time-scored, else duration hints like "AMRAP 20") and modality
mix (M/G/W singles, couplets, triplets). Two views: what the gym programs
(distribution), and where you over/under-perform relative to your own
median (needs a per-workout percentile vs. own history — subtle; design
carefully).

## Similar-workout finder _(L, needs 04)_

Generalize `findRepeats` similarity: movement-set overlap + time-domain
match across _different_ WODs — "efforts like this one" on the workout
detail. PRzilla-style. Main risk: weak matches feel random; require ≥2
shared movements and matching duration class.

## Personal fitness index _(L, needs 05 + 06)_

btwb-style Fitness Level, self-referential: blend benchmark trend, current
e1RMs vs peak, and consistency into one 0–100 trend line. Show _trend_,
never a rank. Danger: a made-up number that moves weirdly erodes trust —
prototype the formula against the real archive in a dev screen before
believing it.

## Attribute radar _(L, needs 03 + 05)_

Tag each workout speed/power/stamina/skill from movements + duration;
aggregate to a radar of training exposure. Would justify adding
`react-native-svg`. Least certain payoff in the catalog — build last.

## Bodyweight-relative strength _(S, needs 06 + a settings field)_

One bodyweight number in settings unlocks "1.5× BW back squat" framing and
published strength-standard comparisons on lift pages.
