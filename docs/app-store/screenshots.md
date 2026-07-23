# Marketing screenshot pipeline

> **The store set is now the branded compositions**, not these bare
> screenshots: `npm run store-previews` frames the raw captures in the brand
> canvas (headline + device frame) at iPhone 6.9", iPhone 6.5", and iPad
> 13" sizes for App Store Connect **plus** three exact-9:16 Google Play sets
> (phone 1440×2560, 7" tablet 1080×1920, 10" tablet 2160×3840) and the Play
> feature graphic (1024×500), emitting `.maestro/marketing/out/store/`. The
> 6.5" set exists because App Store Connect treats it as a separate required
> upload bucket (1284×2778, not auto-waived by supplying the 6.9" set); the
> Play sets exist because Play hard-rejects screenshots taller than 2:1
> (modern iPhone canvases are ~2.17:1) and wants exact 9:16 at ≥1080px for
> promotion eligibility. The Play listing icon (512×512) is
> `assets/images/play-icon.png` from `generate-brand-assets.ts`. The
> `store-previews` skill (`.claude/skills/store-previews/`) wraps the whole
> capture → compose → verify workflow; slide copy lives in
> `scripts/compose-store-previews.ts`. The iPad set becomes uploadable only
> once the app ships iPad support. Everything below documents the
> raw-capture stage it builds on.

App Store screenshots are regenerated on demand, never hand-captured:

```
# one-time per machine: debug build on a 6.9" simulator
xcrun simctl boot 'iPhone 17 Pro Max' && open -a Simulator && npx expo run:ios
npx expo start          # keep Metro running

npm run screenshots     # → .maestro/marketing/out/*.png
```

## What it produces

Five portrait shots at the simulator's native 1320×2868 — an accepted App
Store 6.9"-class size (Apple also accepts 1290×2796 and 1260×2736; one 6.9"
set auto-scales to every smaller iPhone shelf, and iPad is not required for
this iPhone-only app). Store upload order is baked into the filenames:

1. `01-log` — the LOG tab, years of workouts
2. `02-workout` — MURPH workout detail
3. `03-stats` — lifetime stats
4. `04-calendar` — attendance calendar
5. `05-onboarding` — the "EVERY REP. EVERY PR. ANALYZED." hero

Output PNGs are alpha-stripped (App Store Connect rejects transparency) and
dimension-verified by `scripts/process-marketing-screenshots.ts` — a wrong
simulator fails the run rather than producing off-spec files.

## How it stays free of personal data

The dev app's bundled dataset is Chris's real history, and preview mode shows
a red PREVIEW banner — neither can appear in marketing shots. So
`scripts/marketing-screenshots.sh` temporarily copies
`src/data/preview-workouts.json` (committed synthetic sample) over
`src/data/workouts.json`, shoots on the banner-free bundled source, and
restores the real file with `npm run convert` on exit (trap — restores even
when a flow fails). It also pins the status bar to the marketing-standard
9:41 / full battery via `simctl status_bar`, and clears it afterwards.

## Isolation from the e2e suite

Flows live in `.maestro/marketing/flows/`, which `npm run e2e`
(`.maestro/flows/` only) never touches; the e2e suite's assumptions about
the bundled dataset are unaffected because the swap is scoped to the
screenshot run. Raw and final images land in `.maestro/marketing/{raw,out}/`
(both gitignored).

## Changing the shots

- Different screens/order: edit `.maestro/marketing/flows/store-screens.yaml`
  and `STORE_ORDER` in `scripts/process-marketing-screenshots.ts`. Mind the
  Maestro gotchas documented in AGENTS.md.
- Sample data not charming enough: improve
  `scripts/generate-sample-workouts.ts` (regeneratable, never hand-edit its
  output), then `npm run convert`.
