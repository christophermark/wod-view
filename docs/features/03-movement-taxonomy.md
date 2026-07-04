# 03 — Movement taxonomy (foundation)

**Effort:** M · **Depends on:** nothing · **Status:** not started
**Unlocks:** 04 last-time, 05 benchmarks, 06 lift parsing, 07 wrapped, most of 08.

## Why

Almost every interesting analysis (repeat matching, modality balance, volume
odometers, Rx-by-movement) needs to know _which movements a workout contains_
in a structured way. Today that knowledge is a flat list of 23 regexes
(`MOVEMENTS` in `workouts.ts`). This feature upgrades it into a small, tested
taxonomy — not user-facing on its own, but the load-bearing wall for the rest
of the roadmap.

## Design

New module `src/lib/movements.ts` (pure — no React/RN/Node imports):

```ts
export type Modality = 'weightlifting' | 'gymnastics' | 'monostructural';

export interface MovementDef {
  name: string; // canonical display name, e.g. 'Wall Balls'
  pattern: RegExp; // detection incl. aliases/abbreviations (T2B, HSPU, C2B, DU)
  modality: Modality; // CrossFit's M/G/W classification
  equipment?: string; // 'barbell' | 'kettlebell' | 'rower' | 'rig' | ...
  barbellLift?: boolean; // true for lifts that get progression pages (06)
}

export const MOVEMENT_DEFS: MovementDef[]; // target ~60 movements

export interface DetectedMovement {
  def: MovementDef;
  /** Estimated total reps across the workout, null when unparseable. */
  reps: number | null;
}

export function detectMovements(description: string): DetectedMovement[];
```

Rep estimation handles the common SugarWOD schemes (all as _estimates_):

- rep ladders: `21-15-9`, `10-9-8…1` → sum × movements they apply to
- `5 Rounds: 12 Deadlifts …` / `5 RFT` → rounds × line reps
- `EMOM 12: odd — 10 burpees` → minutes/2 × reps
- `AMRAP` → rounds from `scoreRaw`/`Rounds + Reps` score when present, else null
- plain `100 Double Unders` lines

Return `null` rather than guessing when the scheme is ambiguous — consumers
render `≈` totals and skip nulls.

## Migration

`computeStats()` keeps its `movementCounts` API but delegates to
`MOVEMENT_DEFS`, so `stats.tsx` (MOST/LEAST PROGRAMMED) is unchanged. Keep
the existing 23 names' output identical where possible — snapshot the current
counts against the preview dataset before refactoring, and assert parity in a
test.

## Testing

This module earns its keep through tests (`src/lib/__tests__/movements.test.ts`):

- table-driven detection cases from **synthetic** descriptions (copy patterns,
  not content, from the real archive; fixtures live in the test file or reuse
  `data/workouts.sample.csv` via the preview JSON)
- rep-estimation cases per scheme above, incl. the null/ambiguous ones
- false-positive guards: "clean" in "clean up your station" style text,
  `C2B` vs glued-text artifacts from `restoreLineBreaks()`

## Out of scope

- Muscle-group mapping (Hevy-style heatmaps) — the M/G/W modality +
  equipment tags cover our planned analyses; body-part tagging can be added
  to `MovementDef` later without breaking consumers.
- Editing/overriding detections in the UI.
