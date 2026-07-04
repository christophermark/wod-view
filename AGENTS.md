# WOD View — agent guide

Personal iPhone app (Expo SDK 57 / expo-router / TypeScript strict) for browsing archived
SugarWOD workouts. Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/
before writing Expo-specific code — APIs have changed.

## Commands

- `npm run convert` — parse `data/workouts.csv` (or the committed sample fallback) into
  `src/data/workouts.json`, and `data/workouts.sample.csv` into
  `src/data/preview-workouts.json`. Runs automatically on postinstall.
- `npx tsx scripts/generate-sample-workouts.ts` — regenerate the synthetic sample CSV
  (deterministic; seeded PRNG, fixed date range ending 2026-07-01).
- `npx tsx scripts/generate-brand-assets.ts` — regenerate every icon/logo PNG in
  `assets/images/` from the Barlow Condensed "W" mark (single SVG source; edit the script,
  never the PNGs).
- `npm test` / `npm run typecheck` / `npx eslint .` / `npm run format`
- `npx expo start --ios` — run in the iOS simulator (Expo Go).
- CI (`.github/workflows/ci.yml`) runs tsc, eslint (0 warnings), prettier --check, jest.

## Data privacy — hard rule

`data/workouts.csv` and `src/data/workouts.json` contain personal workout history and are
gitignored. Never commit them, never copy their contents into committed files or test
fixtures. Synthetic sample data lives in `data/workouts.sample.csv` (committed, generated
by `scripts/generate-sample-workouts.ts`).

The personal dataset must never reach a release bundle: `data-context.tsx` requires
`workouts.json` only inside an `if (__DEV__)` branch, which Metro strips from production
dependency graphs. If you touch that require, re-verify with `npx expo export` and check
the bundle contains no personal-only strings (see `datasets.test.ts` for the local-only
personal-CSV test pattern).

## Architecture rules

- **`src/lib/workouts.ts` and `src/lib/parse-sugarwod.ts` stay free of React/React Native/Node
  imports.** They are pure, unit-tested, and shared with the Node convert script.
- **Screens get data only from `useWorkouts()`** (`src/lib/data-context.tsx`), never by
  importing JSON or module-level singletons. The provider switches between three sources:
  `bundled` (dev-only test mode, empty in production), `imported` (in-app CSV import,
  persisted via expo-file-system), and `preview` (committed synthetic sample data for App
  Store reviewers, with a persistent exit banner rendered by the root layout).
- Production first launch has no data: `needsOnboarding` gates the main screens behind
  `Stack.Protected` in `_layout.tsx` and routes to `onboarding.tsx` (import or preview).
- **All colors/fonts/spacing come from `src/theme.ts` tokens.** No hardcoded hex values or
  font names in screens. Design direction: "clean athletic light" — paper background, ink
  Barlow Condensed display type, signal-red accent, IBM Plex Mono for scores/measured values.
- Debug-only UI (bundled/preview source toggles, the view-onboarding link in settings) is
  gated behind `__DEV__`. The settings screen itself ships in production for CSV re-import.
- SugarWOD's export strips newlines from description/notes fields; `restoreLineBreaks()` in
  `parse-sugarwod.ts` restores them heuristically. When fixing a mis-split, add a regression
  case to `src/lib/__tests__/parse-sugarwod.test.ts` first.

## Gotchas

- `.npmrc` sets `legacy-peer-deps` because jest-expo@57 pins `@react-native/jest-preset@^0.85`
  while react-native 0.86 wants 0.86 — remove when jest-expo catches up.
- TypeScript 6 needs the explicit `"types": ["node", "jest"]` in tsconfig.json.
- `@testing-library/react-native` v14 is fully async: `render`, `renderHook`, and `unmount`
  all return promises that must be awaited, or React reports overlapping `act()` calls.
  `src/lib/__tests__/import-flow.test.tsx` is the working pattern — it also shows the
  in-memory `expo-file-system` mock for exercising the import flow end-to-end.
