# 06 — Lift progression, e1RM, percent-of-max

**Effort:** M · **Depends on:** 03 (lift-name parsing from descriptions) · **Status:** done

## Why

The most-loved feature of every strength app (Hevy/Strong: e1RM progression,
per-exercise record book), plus Wodify's killer class-time utility: coach says
"take 80% of your 1RM" and the number is two taps away. The stats screen's
`liftBests` list is the seed; this grows it into per-lift pages.

## Data reality (measured)

- Only **15 rows** carry `barbell_lift` — but **56** workouts are
  `scoreType === 'Load'`, and their `set_details` are `{load, success}` per
  set (72 such sets in the archive). Failed attempts are visible
  (`success: false`) — surface them; a missed attempt is information.
- **No per-set rep counts.** Reps live in the description ("Back Squat 5×5",
  "work to a heavy 3"). e1RM therefore needs the taxonomy's scheme parsing.

## Data & algorithms

New pure module `src/lib/lifts.ts`:

```ts
export interface LiftSession {
  workoutId: string; date: string;
  topLoad: number; sets: { load: number; success: boolean }[];
  reps: number | null;          // per-set reps parsed from description, if found
  e1rm: number | null;          // Epley: load * (1 + reps/30); null when reps unknown
}
export interface LiftPage {
  lift: string;
  sessions: LiftSession[];      // oldest first
  allTimeMax: number;           // best successful load
  currentMax: number;           // best successful load in trailing 6 months (btwb's All-Time vs Current)
  bestE1rm: number | null;
  missCount: number;
}
liftPages(list: Workout[]): LiftPage[]
percentTable(max: number): { pct: number; load: number }[]  // 95→50 in 5s, rounded to 5 lb
```

Lift attribution: use `barbell_lift` when tagged; otherwise, for `Load`
workouts, detect the lift from the description via taxonomy defs flagged
`barbellLift: true`. Normalize names ("Back Squat" ≡ "back squats"). A Load
workout matching two lifts (e.g. "Clean & Jerk complex") gets one page under
the complex's full detected name rather than polluting both lifts' charts.

Rep parsing for e1RM: sets×reps schemes (`5x5`, `3-3-3-1-1-1`, `EMOM 10: 2
reps`). When unparseable, `reps = null` — the session still charts by
`topLoad`, only the e1RM line skips it. Cap Epley at 10 reps (beyond that the
formula is fiction).

## UX

- Stats screen: existing lift-bests section becomes tappable rows →
  `src/app/lift/[name].tsx`.
- Lift page, top to bottom:
  - Score-card-style header (dark card, mono digits): CURRENT MAX big,
    ALL-TIME MAX + date beneath (highlight when they're equal — you're at
    your peak).
  - Load-over-time chart: one bar per session (hand-rolled Views), failed
    top attempts marked in `colors.accent`; e1RM shown as a small mono value
    above bars where computable.
  - PERCENTAGES card: two-column mono table from `percentTable(currentMax)` —
    the whiteboard moment. Use _current_ max, with a toggle for all-time.
  - Session list: date, sets as `3×135 ✓ · 1×145 ✗`, note excerpt.

## Testing

`src/lib/__tests__/lifts.test.ts`: attribution (tagged vs parsed vs complex),
current-vs-all-time window math with fixed today, Epley values incl. the
10-rep cap and null propagation, percent rounding (to 5 lb), miss counting.

## Out of scope

- Bodyweight-ratio strength standards ("1.5× BW back squat") — needs a
  bodyweight setting; note it in 08.
- Kilogram support — the archive is lb; revisit if ever needed.
