# Feature roadmap — analytics

Feature briefs from the July 2026 analytics design research. Each doc is
self-contained: pick the top unblocked one, hand it to a session ("implement
docs/features/03-movement-taxonomy.md"), and it has everything needed to start.

Numbering is the recommended build order — each step makes the next cheaper.

| #   | Feature                                           | Effort | Depends on        | Status      |
| --- | ------------------------------------------------- | ------ | ----------------- | ----------- |
| 01  | [Consistency heatmap](01-consistency-heatmap.md)  | S      | —                 | not started |
| 02  | [On this day](02-on-this-day.md)                  | S      | —                 | not started |
| 03  | [Movement taxonomy](03-movement-taxonomy.md)      | M      | —                 | not started |
| 04  | ["Last time" panel](04-last-time-panel.md)        | M      | 03                | not started |
| 05  | [Benchmarks](05-benchmarks.md)                    | M      | 03                | not started |
| 06  | [Lift progression + e1RM](06-lift-progression.md) | M      | 03 (rep parsing)  | not started |
| 07  | [WOD Wrapped recaps](07-wod-wrapped.md)           | M      | 03, ideally 04–06 | not started |
| 08  | [Deep-cuts backlog](08-deep-cuts-backlog.md)      | varies | varies            | ideas       |

Full research (competitor survey, athlete needs, sources) lives in the
session artifact; the distilled rationale is in each brief's "Why".

## Conventions all features follow

- **Logic first, UI second.** Every feature starts as pure functions in
  `src/lib/` (no React/RN/Node imports), unit-tested in `src/lib/__tests__/`,
  then gets a screen. This matches `workouts.ts` / `parse-sugarwod.ts`.
- **Screens read `useWorkouts()` only** — never JSON imports or singletons.
  The workout list is newest-first; `workoutById` map already exists.
- **Tokens only** — colors/fonts/spacing from `src/theme.ts`. Scores, dates,
  and anything measured render in mono (`fonts.mono` / `fonts.monoBold`).
- **Label derived stats as approximate.** Descriptions pass through
  `restoreLineBreaks()` heuristics, so text-derived counts are estimates —
  show `≈` and never present them as exact.
- **Privacy is a hard rule.** Test fixtures are synthetic only. Static
  reference data (benchmark standards, movement taxonomy) is committed;
  personal data never is. Everything computes on-device.
- **No chart library yet.** The stats screen hand-rolls bars with Views.
  Prefer that for grids/bars; if a feature truly needs lines/curves, discuss
  adding `react-native-svg` in that feature's PR, not as a side effect.

## Dataset facts to design against

Measured on the real archive (354 workouts, Jul 2023–present):

- score types: ~150 empty (times), 110 Reps, 56 Load, 11 Inches, 8
  Rounds + Reps, plus Checkbox/Emoji/Other/Calories stragglers.
- `set_details` key shapes: `{mins,secs}` ×163, `{reps}` ×133,
  `{load,success}` ×72 (failed attempts visible!), `{inches}`, `{rnds,reps}`…
- `barbell_lift` tagged on only 15 rows — lift features must also parse
  descriptions.
- 281/354 workouts have athlete notes.
- Titles are mostly "Tuesday 7.4.2023 Coach …" — benchmark names usually
  live in the description, not the title.
