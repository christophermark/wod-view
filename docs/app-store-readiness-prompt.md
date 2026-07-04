# WOD View — App Store Readiness

> This is a reusable kickoff prompt for an autonomous App Store submission session.
> Paste it (or reference this file) when starting that work.

You are Claude Fable 5, acting as the lead agent for getting WOD View ready for
submission to the iOS App Store. This is an open-ended readiness project, not a scripted
task list — research current requirements yourself (Apple's guidelines and App Store
Connect's submission requirements change; don't rely on stale training data — for
version-sensitive things, especially screenshot dimensions, App Privacy questionnaire
wording, and export-compliance rules, go find the current source of truth), form your own
plan, and use sub-agents/parallel work where that speeds things up. Work through this
end to end without pausing to ask — make the calls yourself, log what you decided and
why, and keep going. Don't wait for sign-off before starting broad or irreversible-feeling
work; the only things worth actually stopping for are listed in "How to work" below.

## What WOD View is

A personal iPhone app (Expo SDK 57 / expo-router / TypeScript strict) for browsing an
archived SugarWOD workout history. There is no backend, no accounts, no auth, and no
network data layer — the user imports their SugarWOD CSV export in-app and everything
lives on-device (persisted via expo-file-system). No photos, no social features, no
analytics/tracking SDKs in v1 (verify that claim against the dependency tree rather than
trusting this sentence).

Design direction and tone are documented in `AGENTS.md` and `src/theme.ts` — "clean
athletic light": paper background, ink Barlow Condensed display type, signal-red accent,
IBM Plex Mono for scores/measured values. Store copy should sound like that — direct,
athletic, utilitarian — not generic app-store marketing. `AGENTS.md` also has hard
architecture rules (theme tokens only, data only via `useWorkouts()`, pure lib modules)
that apply to any new screens or flows you add.

Bundle ID: `com.christophermark.wodview` (iOS + Android same id, `app.json`). `ios/` and
`android/` are gitignored prebuild output, not committed — regenerated via
`npx expo prebuild` / `npx expo run:ios`. Portrait-only, no `supportsTablet` (iPhone-only),
`userInterfaceStyle: "automatic"` — check what the app actually does in dark mode and
decide whether to support it or lock to light before submission. There's no `eas.json`
yet — you'll need to figure out and set up a build/submit pipeline (EAS Build/Submit vs.
local Xcode archive + Transporter); check what's actually a good fit given the native
folders aren't committed.

Local dev stack, test suites, data pipeline, and known gotchas (legacy-peer-deps, async
testing-library, Maestro text-matching quirks) are things you should discover by reading
`AGENTS.md`, `.maestro/flows/`, and `package.json` scripts — don't assume, verify against
the current repo state.

## Hard constraint — personal data must not ship

`data/workouts.csv` and `src/data/workouts.json` are Chris's real workout history and are
gitignored. The release bundle must contain none of it: `src/lib/data-context.tsx` requires
`workouts.json` only inside an `if (__DEV__)` branch that Metro strips from production
builds. Before any archive/submission, re-verify with `npx expo export` that the production
bundle contains no personal-only strings (see `src/lib/__tests__/datasets.test.ts` for the
pattern). Treat this as a release-blocking check, not a nice-to-have — bake it into
whatever build pipeline you set up.

## The goal

Get from "app works locally" to "submitted to App Store Connect and passing review."
That means figuring out, producing, and documenting everything Apple actually requires
for this specific app — don't assume you already know the full list; go check current
App Store Connect requirements and App Review Guidelines as part of this work. Areas we
know matter, at minimum:

- **Store listing content**: name, subtitle, description, keywords, promotional text,
  support URL, category (likely Health & Fitness — confirm), age rating answers,
  copyright/contact info. Match the app's voice, not boilerplate. Two naming/trademark
  things to check rather than guess: whether "WOD View" is available as an App Store
  name, and how to reference SugarWOD (a third-party product whose export format this
  app consumes) and CrossFit-adjacent terminology in listing copy without tripping
  Apple's trademark/metadata rules.
- **Privacy**: a hosted, publicly reachable privacy policy (Apple requires the URL even
  for apps that collect nothing), plus the App Privacy questionnaire. The honest story
  here is unusually good — all data is imported by the user and stays on-device, nothing
  is transmitted — which likely means "Data Not Collected," but verify that label's
  current criteria actually fit (any crash reporting, Expo services, or OS-level
  fetches would break it) rather than assuming. The policy should plainly describe the
  local-only model, including that imported workout data may include personal notes.
  Hosting the policy needs a real URL — a GitHub Pages page off this repo is probably
  the pragmatic option; decide and set it up.
- **Visual assets**: verify the existing icon set (light/dark/tinted variants in
  `assets/images/`, generated by `scripts/generate-brand-assets.ts`) meets current spec,
  and produce App Store screenshots for whatever device sizes Apple currently requires.
- **A repeatable screenshot pipeline**: Chris wants to regenerate App Store screenshots
  on demand, not hand-capture them once. We already use Maestro for E2E (`.maestro/flows/`,
  run via `npm run e2e`, screenshots to `.maestro/screenshots/`) — design something
  similar but durable for marketing shots: its own flow directory, isolated from the E2E
  suite so it doesn't disturb those flows' assumptions. Data source: preview mode already
  ships committed synthetic sample data (`src/data/preview-workouts.json`, generated
  deterministically by `scripts/generate-sample-workouts.ts`) — use it, and if it isn't
  charming enough for marketing material, improve the generator (scripted and
  regeneratable, never hand-edited — that's the repo convention; `generate-brand-assets.ts`
  is the pattern). Mind the AGENTS.md Maestro gotchas (full-string regex matching,
  testIDs, occluded-element leakage, screenshot-then-tap swallowing).
- **App Review access**: mostly solved by design — there are no accounts, and production
  first-launch onboarding offers preview mode (the committed synthetic dataset, with a
  persistent exit banner) exactly so a reviewer can see a populated app without a
  SugarWOD export. Verify that path end-to-end in a production-like build (onboarding →
  preview → all tabs work), and write App Review notes that tell the reviewer to use it.
  Also check whether an app whose real data path requires a third-party CSV export
  raises any current guideline concerns (minimum functionality, 4.2) and how the listing
  should frame it.
- **Export compliance**: confirm what WOD View's actual answer to Apple's encryption
  questionnaire should be. The app appears to make no network calls at all — verify
  that, then confirm the correct declaration (likely the standard
  exemption/`ITSAppUsesNonExemptEncryption: false` in `app.json`, but confirm current
  rules rather than assume).
- **Apple Developer Program**: confirm whether Chris already has an active enrollment
  and the app is registered there — this is a prerequisite you can't do on his behalf,
  so surface it as a question rather than assuming.

## How to work

- Run autonomously. Make judgment calls, document the reasoning as you go (a running
  log or notes file is fine), and keep moving rather than pausing to confirm each step.
- Some things genuinely can't be done without Chris — anything needing his Apple ID
  login, his payment method, or an account only he can create (Apple Developer Program
  enrollment, App Store Connect access, a domain purchase). When you hit one of these,
  don't stop the whole thread: write down exactly what's needed and why, keep working on
  everything else that isn't blocked by it, and come back to the blocked item once it's
  unblocked.
- The one true stop point is hitting "submit for review" in App Store Connect itself —
  once everything else is ready, surface that it's ready and wait for Chris to say go,
  rather than submitting on your own.
- If you find requirements or constraints that change the shape of the plan (e.g.
  Apple's current guidance turns out to require something not listed above), just say so
  and adjust — this brief is a starting point, not a spec.
