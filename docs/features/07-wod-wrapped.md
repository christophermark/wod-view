# 07 — WOD Wrapped (year & month recaps)

**Effort:** M · **Depends on:** 03 (volume estimates); richer with 04–06 · **Status:** not started

## Why

Strava's Year in Sport is loved enough that they moved it behind the
subscription paywall. For an archive app a recap is nearly free — every stat
already exists or ships with earlier roadmap items — and the app's
jersey-number aesthetic is _made_ for big shareable stat cards.

## UX

Full-screen horizontally-paged cards, route `src/app/recap/[period].tsx`
(`period` = `2025` or `2025-06`):

1. **Cover** — "2025 · THE LOG" (displayBlack, paper on ink).
2. **Showed up** — sessions, active days, best streak, mini heatmap (01).
3. **The work** — top 3 movements with `≈` rep totals ("≈1,240 WALL BALLS").
4. **PRs** — count + the standout (heaviest lift PR or biggest benchmark
   improvement once 05/06 exist).
5. **Rx** — Rx rate, delta vs previous year.
6. **Superlatives** — busiest month, most-repeated WOD (via 04), longest
   workout.
7. **Share** — the year on one card.

Entry points: stats screen card per completed year ("2025 WRAPPED →");
December/January banner for the just-finished year. Month recaps reuse the
same screen with fewer cards — defer until the year version proves out.

Sharing: `react-native-view-shot` captures the current card,
`expo-sharing` opens the share sheet (two new deps — check Expo SDK 57
compatibility at https://docs.expo.dev/versions/v57.0.0/ before adding).
Cards render at screen size; capture at 2× pixel ratio for crisp exports.

## Data & algorithms

Pure module `src/lib/recap.ts`:

```ts
interface Recap {
  period: string;
  sessions: number; activeDays: number; streakWeeks: number;
  topMovements: { name: string; reps: number | null }[];
  prCount: number; standoutPr: { title: string; score: string } | null;
  rxRate: number; rxRateDelta: number | null;   // vs prior period
  busiestMonth: { title: string; count: number } | null;  // year recaps only
  mostRepeated: { title: string; count: number } | null;  // needs 04; null until then
  longestWorkout: { title: string; score: string } | null; // max scoreRaw among time-scored
}
computeRecap(list: Workout[], period: string): Recap
```

Mostly filtering + delegating to `computeStats()` and `detectMovements()`.
Every field is nullable so the screen degrades gracefully on sparse
periods and before 04–06 land — a card with no data doesn't render.

## Testing

- `computeRecap` against synthetic multi-year fixtures: period filtering,
  rx delta across years, null paths (first year → no delta; no time-scored
  workouts → no longest).
- Screen smoke-test with the preview dataset (`preview` source renders a
  full recap — this is also the App Store reviewer's path, and the sample
  data ends 2026-07-01 so year 2025 is fully populated).

## Out of scope

- Animated transitions/confetti — ship static cards first; motion is polish.
- Auto-generated recap notifications.
