# 04 — "Last time" panel

**Effort:** M · **Depends on:** 03 (movement taxonomy) · **Status:** not started

## Why

"What did I do last time?" is the universal question when a workout repeats,
and the single highest-value thing this archive can answer. It's also where
the 281 notes pay off: your past self already wrote the pacing advice ("went
out too hot — break up the T2B early"). This feature turns the archive from
a diary into a coach.

## UX

On `src/app/workout/[id].tsx`, a new section between the score card and
THE WORKOUT:

- Section label `LAST TIME` (existing `sectionLabel` style). Only rendered
  when matches exist.
- One row per earlier instance (max 3, newest first): date (mono), score
  (mono, bold), `RxChip`, and the note shown in full underneath in the
  existing notes style. Tap row → push that workout's detail.
- Exact repeats and near-matches are visually distinct: near-matches get a
  `SIMILAR` chip (`TagChip`) instead of nothing, so a rescaled or reworded
  version of the WOD is never presented as the same workout.

## Data & algorithms

New pure module `src/lib/repeats.ts`:

```ts
export interface RepeatMatch {
  workout: Workout;
  kind: 'repeat' | 'similar';
}
export function findRepeats(target: Workout, all: Workout[]): RepeatMatch[];
```

Matching strategy (two tiers):

1. **Fingerprint** — normalize the description: lowercase, map movement
   aliases to canonical taxonomy names (03), strip loads (`95#/65#`, `50/35`),
   coach names, and whitespace; keep the rep scheme tokens (`21-15-9`,
   `5 rounds`). Identical fingerprints → `repeat`.
2. **Similarity** — same movement _set_ (from `detectMovements`) and same
   score type, but different scheme/loads → `similar` when Jaccard overlap of
   movement names ≥ 0.8 and workout duration class matches.

Only compare within the same `scoreType` family (a Load day never matches a
metcon). Precompute fingerprints once per dataset — memoize keyed on the
workouts array reference (the provider replaces the array on import), either
in `data-context.tsx` or a `WeakMap` inside `repeats.ts`.

## Testing

`src/lib/__tests__/repeats.test.ts`, synthetic fixtures:

- verbatim repeat across years → `repeat`
- same WOD reworded ("5 RFT" vs "5 Rounds For Time", different coach header,
  different load notation) → `repeat`
- same movements, different scheme (21-15-9 vs 15-12-9) → `similar`
- different movements sharing words ("squat clean" vs "front squat") → no match
- must never match itself or later-dated workouts

## Out of scope

- Cross-type comparisons and "efforts like this" discovery (tier-3
  similar-workout finder in 08 builds on this module).
- Any UI on the log list ("repeat" badges there — v2, cheap once this ships).
