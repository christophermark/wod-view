# Lift progression — intentions & principles

Companion to the build brief in [06-lift-progression.md](06-lift-progression.md).
That doc says what was built; this one says why, so future changes can honor the
intent without being bound to the current implementation. Living doc — edit freely.

## What the feature is for

One lift at a time, answer three questions:

1. **Where am I now?** Current max vs all-time max, and whether they're the same
   (you're at your peak) or drifting apart (you're detrained or rebuilding).
2. **How did I get here?** The trend over time, including the sessions that
   didn't go to plan.
3. **What goes on the bar today?** Percent-of-max, two taps from the whiteboard.

## Principles

- **Different rep schemes must be comparable.** A 3×5 week and a 1RM week are
  the same training story told at different volumes. Estimated 1RM (Epley) puts
  them on one line. But an estimate is not a lift: it renders visibly as an
  estimate (dashed, labeled "EST."), never replaces the actual load, and is
  skipped rather than guessed when reps are unknown or the formula stops being
  credible (past ~10 reps).
- **A single counts as itself.** A real 1-rep max is the demonstrated max — no
  formula inflation on top of it.
- **Honest data over complete data.** The primary series is what was actually
  lifted. Misses are information, not noise — surface them. Anything parsed
  from free text is approximate; when parsing fails, show less rather than
  guess.
- **Every number explains itself.** No cryptic labels or reader-decodes-it
  shorthand. Series get a legend; values appear next to plain-language labels;
  detail lives behind a tap instead of crowding the chart.
- **Detail on demand, never gated.** The chart carries the trend; tapping a
  point gives the session; the session links to the workout. Everything the
  chart shows is also readable in the session list without touching the chart.
- **Legible to every body.** Status (a missed attempt) is never color-alone —
  shape carries it too. Tap targets are finger-sized, not point-sized.

## Non-goals

- Not a training planner — it reports history, it doesn't prescribe.
- No cross-lift composite scores or leaderboards.
- Kilograms and bodyweight-ratio standards are out for now (see the
  deep-cuts backlog).

## Where things live

Logic is pure and unit-tested in `src/lib/lifts.ts` (attribution, rep parsing,
e1RM, maxes); the screen is `src/app/lift/[name].tsx`; entry point is the
tappable LIFT BESTS list on the stats tab.
