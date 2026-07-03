# WOD View

A clean, athletic archive viewer for exported [SugarWOD](https://www.sugarwod.com/) workouts, built with Expo + React Native.

## Screens

- **Log** — chronological feed of every workout, grouped by month, with free-text search (titles, descriptions, notes) and quick filters (PRs, Rx, Scaled, For Time, Reps, Load).
- **Calendar** — month grid of training days; gold days are PR days. Tap a day to see what you did.
- **Stats** — lifetime stat tiles, WODs-per-year chart (or per-month when a year is selected via the year filter), barbell lift bests, most/least-programmed movements, and log milestones.
- **Workout detail** — full whiteboard description, your score (with PR treatment), and athlete notes.

## Data

Personal workout data stays untracked:

- `data/workouts.csv` — the raw SugarWOD export (**gitignored**)
- `src/data/workouts.json` — generated, typed app data (**gitignored**)

To (re)import an export:

```sh
cp ~/Downloads/workouts.csv data/workouts.csv
npm run convert
```

The convert script also restores the line breaks SugarWOD strips from workout
descriptions and notes on export, using formatting heuristics.

## Development

```sh
npm install          # postinstall converts your CSV (or the committed sample) automatically
npx expo start --ios
```

Useful commands: `npm test`, `npm run typecheck`, `npx eslint .`, `npm run format`.
CI runs all four on every push.

In dev builds, a gear icon on the Log screen opens a debug settings screen where you can
import a SugarWOD CSV in-app and switch between the bundled and imported datasets.
