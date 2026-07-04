# 02 — On this day

**Effort:** S · **Depends on:** nothing · **Status:** not started

## Why

An archive app's cheapest emotional win: "Two years ago today — first Rx
pull-ups." One date lookup, one card. Strava/Timehop-style resurfacing is
loved everywhere it exists, and this app is _made_ of past workouts.

## UX

On the log tab (`src/app/(tabs)/index.tsx`), a dismissible card above the
list, shown only when a past workout (different year, same month/day) exists:

- Eyebrow: `ON THIS DAY · 2024` (display font, accent color).
- Workout title, score in mono, Rx/PR chips (reuse `RxChip`/`PrBadge` from
  `src/components/badges`).
- Tap → `router.push('/workout/[id]')`. Multiple matches → show the most
  recent, with "+1 MORE" suffix navigating to the older one from there via
  its own card.
- Dismissal is per-day, in-memory only (component state keyed to today's
  date) — no persistence needed.

## Data & algorithms

New pure helper in `src/lib/workouts.ts`:

```ts
/** Past-year workouts sharing todayIso's month/day, newest first. */
onThisDay(list: Workout[], todayIso: string): Workout[]
```

Rules: exclude same-year matches; Feb 29 matches only Feb 29 (no smearing to
Mar 1); `todayIso` is a parameter for testability.

Prioritize interesting matches when several years hit: PR days first, then Rx,
then newest — expose as the sort order of the returned array.

## Implementation sketch

- `src/lib/workouts.ts` + tests (multi-year fixtures, Feb 29, no-match,
  same-year exclusion, sort priority).
- `src/app/(tabs)/index.tsx` — card component; styles from `theme.ts` only.

## Out of scope

- Push notifications ("your Murph anniversary is tomorrow") — needs
  expo-notifications and permission UX; revisit only if the card proves
  its worth.
