# 01 — Consistency heatmap

**Effort:** S · **Depends on:** nothing · **Status:** not started

## Why

Consistency is the stat athletes are proudest of — btwb makes a year of
"Training Days" its default analytics view. The stats screen already knows
`activeDays` and `longestStreakWeeks` as single numbers; a year grid makes the
same data emotional: dense months, honest gaps, the streak you can see.

## UX

On the stats tab, a new card under the year chips (respecting the existing
year filter):

- GitHub-style grid: 7 rows (Mon–Sun) × up to 53 columns, one cell per day.
  Cell states: empty (no workout, `colors.hairline`), trained (`colors.ink`),
  PR day (`colors.gold`), multi-workout day (`colors.accent`). Month initials
  along the top in `fonts.mono` 10pt.
- Below the grid, two `FactRow`s (existing component pattern in `stats.tsx`):
  CURRENT STREAK (consecutive calendar weeks with ≥1 workout, counting back
  from today) and LONGEST GAP (days between adjacent workouts, with the date
  range, e.g. "23 DAYS · AUG 2–24 2024").
- When "ALL" years is selected, show the most recent 12 months instead of a
  multi-year grid.

## Data & algorithms

New pure helpers in `src/lib/workouts.ts`:

```ts
interface DayCell { date: string; count: number; pr: boolean }
/** 53×7 grid for a calendar year (or trailing 12 months when year is null). */
dayGrid(list: Workout[], year: number | null, todayIso: string): DayCell[][]
currentStreakWeeks(list: Workout[], todayIso: string): number
longestGap(list: Workout[]): { days: number; from: string; to: string } | null
```

`buildWorkoutsByDate()` already exists — build on it. Pass `todayIso` as a
parameter (no `new Date()` inside lib functions) so tests are deterministic.

## Implementation sketch

- `src/lib/workouts.ts` — helpers above + tests in
  `src/lib/__tests__/workouts.test.ts` (fixed synthetic dates; year
  boundaries; empty list; single workout; leap year).
- `src/app/(tabs)/stats.tsx` — render the grid with plain `View`s (cells are
  ~4×4 with 2px gaps; a 53-column grid fits an iPhone width at that size,
  wrap in horizontal `ScrollView` as a fallback).

## Out of scope

- Tapping a cell to jump to that day (the calendar tab already does this —
  a v2 nicety).
- Intensity shading by workout count beyond the three states above.
