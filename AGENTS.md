# WOD View — agent guide

Personal phone app (Expo SDK 57 / expo-router / TypeScript strict) that turns the
workout-history export from a previous gym app (SugarWOD and Chalk It Pro supported) into
a private on-device training archive — phone-first on both iOS and Android, released to
the App Store and Google Play. Durable product facts (platforms, import sources, URLs,
contact email) live in `docs/app-intent.md` — check it before writing user-facing copy,
and update it when any of those truths change. Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing Expo-specific code — APIs have
changed.

Planned analytics features live as self-contained briefs in `docs/features/` (see the
README there for build order and conventions). When asked to implement one, start from
its brief.

## Commands

- `npm run convert` — parse `data/workouts.csv` (or the committed sample fallback) into
  `src/data/workouts.json`, and `data/workouts.sample.csv` into
  `src/data/preview-workouts.json`. Runs automatically on postinstall.
- `npx tsx scripts/generate-sample-workouts.ts` — regenerate the synthetic sample CSV
  (deterministic; seeded PRNG, fixed date range ending 2026-07-01).
- `npx tsx scripts/generate-brand-assets.ts` — regenerate every icon/logo PNG in
  `assets/images/` from the Barlow Condensed "W" mark (single SVG source; edit the script,
  never the PNGs).
- `npx tsx scripts/analyze-movement-coverage.ts` — audit movement-detection coverage
  against the local dataset. The `/movement-sweep` skill wraps it with the full
  interpret-and-expand workflow.
- `npm test` / `npm run typecheck` / `npx eslint .` / `npm run format`
- `npx expo start --ios` — run in the iOS simulator (Expo Go).
- `npm run e2e` — Maestro e2e flows with screenshots (see "E2E self-verification" below).
- `npm run screenshots` — regenerate raw App Store marketing screenshots
  (`.maestro/marketing/`, isolated from the e2e suite; see
  `docs/app-store/screenshots.md`). Temporarily swaps the bundled dataset to the
  synthetic sample so no personal data or preview banner appears, restores on exit.
- `npm run store-previews` — compose the raw shots into the branded store images
  (App Store iPhone/iPad sizes + Google Play sets). The `/store-previews` skill wraps capture → compose →
  visual verification; slide copy lives in `scripts/compose-store-previews.ts`.
- `npm run verify:release-bundle` — release-blocking check that the production
  `expo export` (iOS + Android) contains no personal-dataset strings. Run before
  every store build.
- `npm run deploy:build` — Fastlane's gated build of both signed store artifacts
  (IPA + AAB). `npm run deploy:submit` is the default release path: submits both
  stores for review with the release notes; they go live automatically on
  approval. Upload-only lanes (`deploy:testflight` / `deploy:app-store` /
  `deploy:play`) upload without submitting, for TestFlight-only or held-back
  releases. All of them only ship what was built — never rebuild. Versioning via
  `npm run version:minor|patch` (local commit + tag; also stamps the store
  release notes from `docs/app-store/whats-new.md` into `fastlane/metadata/`;
  push happens after a successful build — the `/release` skill orchestrates).
  Setup and behavior live in `docs/app-store/deployments.md`.
- CI (`.github/workflows/ci.yml`) runs tsc, eslint (0 warnings), prettier --check, jest.

App Store submission state, listing copy, and pipeline docs live in `docs/app-store/`
(start at its README). The website, privacy policy, and support pages live on Chris's
personal site — https://www.christophermark.me/wodview (+ `/privacy`, `/support`), source
in the `~/dev/christophermark.me` repo — keep them true if data handling ever changes.
`docs/privacy/` and `docs/support/` here are only redirect stubs for the retired GitHub
Pages URLs.

## Public repository — hard rule

This repo is **public on GitHub**. Never commit secrets: API keys, `.p8`/keystore
files, service-account JSON, `fastlane/.env`, tokens, or anything derived from them.
Whenever a change introduces tooling that can produce credentials, local config, or
machine-specific output, add defensive `.gitignore` entries **in the same change** —
don't rely on remembering not to `git add` them. Committed templates (like
`fastlane/.env.default`) must be placeholder-only with every line commented out.

## Data privacy — hard rule

`data/workouts.csv` and `src/data/workouts.json` contain personal workout history and are
gitignored. Never commit them, never copy their contents into committed files or test
fixtures. Synthetic sample data lives in `data/workouts.sample.csv` (committed, generated
by `scripts/generate-sample-workouts.ts`).

The personal dataset must never reach a release bundle: `data-context.tsx` requires
`workouts.json` only inside an `if (__DEV__)` branch, which Metro strips from production
dependency graphs. If you touch that require, re-verify with `npm run verify:release-bundle`
(exports a production bundle and scans it for personal-only strings; also see
`datasets.test.ts` for the local-only personal-CSV test pattern).

## Architecture rules

- **`src/lib/workouts.ts` and the parser modules (`parse-sugarwod.ts`, `parse-chalkitpro.ts`,
  `parse-workouts-csv.ts`) stay free of React/React Native/Node imports.** They are pure,
  unit-tested, and shared with the Node convert script.
- The import flow parses through `parseWorkoutsCsv()` (`parse-workouts-csv.ts`), which
  detects the source app by CSV header: SugarWOD or Chalk It Pro. All user-facing copy —
  store listings, website, and in-app import screens — names both services (since
  2026-07-23). The step-by-step export walkthrough stays SugarWOD-focused (its export flow
  is the documented one), with a one-line Chalk It Pro note in the steps card.
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

## E2E self-verification (Maestro)

`npm run e2e` runs the flows in `.maestro/flows/` against the iOS simulator and drops
screenshots in `.maestro/screenshots/` (gitignored) — read them to visually verify UI
work. One-time setup: `npx expo run:ios` (debug build, loads JS from Metro so code
changes need no rebuild), then keep `npx expo start` running. The runner script
(`scripts/e2e.sh`) checks prerequisites and picks the booted simulator that has the app
installed. Failure screenshots land in `ls -t ~/.maestro/tests | head -1`.

Flow-writing gotchas (all learned the hard way — see comments in the flows):

- Maestro text matching is a **full-string regex** against the element's accessibility
  text. RN Pressables collapse all child Texts into one string (`"LABEL, subtitle, …"`;
  workout cards start with the date rail: `"WED, 1, POWER CLEAN 3X5, …"`), and tab bar
  buttons read `"LOG, tab, 1 of 3"` — so match with `.*X.*` patterns or testIDs.
- Screens lower in the navigation stack leak their (occluded) elements into the
  hierarchy; identical-looking controls (the `‹ BACK` buttons) need unique testIDs
  (`onboarding-back`, `settings-back`, `workout-back`, `benchmark-back`,
  `benchmarks-back`, `lift-back`; also `settings-button`, `log-search`).
- Dev builds boot straight to the LOG tab on the bundled dataset — `clearState` does
  NOT surface onboarding. Flows reach onboarding via settings → DEV TOOLS and preview
  via settings → PREVIEW MODE row (`.maestro/subflows/enter-preview.yaml`).
- Assertions must only reference the committed synthetic sample data (deterministic:
  newest workout "Power Clean 3x5", "MURPH" exists for search) — never the personal
  bundled dataset.
- A tap fired immediately after `takeScreenshot` can be swallowed; precede it with
  `waitForAnimationToEnd`.

## Gotchas

- Adding a native module (`npx expo install <pkg>`) requires rebuilding the dev
  app; use `npx expo prebuild -p ios --clean && npx expo run:ios`. Incremental
  rebuilds on the stale generated `ios/` can die with undefined-symbol linker
  errors (`facebook::react::Sealable`, `ShadowNode::getDebugName`) against the
  prebuilt React core — the clean prebuild is the fix, not
  `buildReactNativeFromSource`.
- `.npmrc` sets `legacy-peer-deps` because jest-expo@57 pins `@react-native/jest-preset@^0.85`
  while react-native 0.86 wants 0.86 — remove when jest-expo catches up.
- TypeScript 6 needs the explicit `"types": ["node", "jest"]` in tsconfig.json.
- `@testing-library/react-native` v14 is fully async: `render`, `renderHook`, and `unmount`
  all return promises that must be awaited, or React reports overlapping `act()` calls.
  `src/lib/__tests__/import-flow.test.tsx` is the working pattern — it also shows the
  in-memory `expo-file-system` mock for exercising the import flow end-to-end.
