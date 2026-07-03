# WOD View — agent guide

Personal iPhone app (Expo SDK 57 / expo-router / TypeScript strict) for browsing archived
SugarWOD workouts. Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/
before writing Expo-specific code — APIs have changed.

## Commands

- `npm run convert` — parse `data/workouts.csv` (or the committed sample fallback) into
  `src/data/workouts.json`. Runs automatically on postinstall.
- `npm test` / `npm run typecheck` / `npx eslint .` / `npm run format`
- `npx expo start --ios` — run in the iOS simulator (Expo Go).
- CI (`.github/workflows/ci.yml`) runs tsc, eslint (0 warnings), prettier --check, jest.

## Data privacy — hard rule

`data/workouts.csv` and `src/data/workouts.json` contain personal workout history and are
gitignored. Never commit them, never copy their contents into committed files or test
fixtures. Synthetic sample data lives in `data/workouts.sample.csv` (committed).

## Architecture rules

- **`src/lib/workouts.ts` and `src/lib/parse-sugarwod.ts` stay free of React/React Native/Node
  imports.** They are pure, unit-tested, and shared with the Node convert script.
- **Screens get data only from `useWorkouts()`** (`src/lib/data-context.tsx`), never by
  importing JSON or module-level singletons. The provider switches between the bundled
  dataset ("test mode") and a CSV imported in-app (persisted via expo-file-system).
- **All colors/fonts/spacing come from `src/theme.ts` tokens.** No hardcoded hex values or
  font names in screens. Design direction: "clean athletic light" — paper background, ink
  Barlow Condensed display type, signal-red accent, IBM Plex Mono for scores/measured values.
- Debug-only UI (like the settings/import screen entry point) is gated behind `__DEV__`.
- SugarWOD's export strips newlines from description/notes fields; `restoreLineBreaks()` in
  `parse-sugarwod.ts` restores them heuristically. When fixing a mis-split, add a regression
  case to `src/lib/__tests__/parse-sugarwod.test.ts` first.

## Gotchas

- `.npmrc` sets `legacy-peer-deps` because jest-expo@57 pins `@react-native/jest-preset@^0.85`
  while react-native 0.86 wants 0.86 — remove when jest-expo catches up.
- TypeScript 6 needs the explicit `"types": ["node", "jest"]` in tsconfig.json.
