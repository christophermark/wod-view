---
name: store-previews
description: This skill should be used to regenerate WOD View's store preview images — branded "meet card" compositions (headline + framed app screenshot) at App Store sizes (iPhone 6.9", iPhone 6.5", iPad 13") and Google Play sizes (9:16 phone + 7"/10" tablet sets, plus the 1024×500 feature graphic). Trigger on requests like "regenerate the store previews/screenshots", "update the App Store/Play Store images", after any UI change that alters the marketed screens, or when slide copy needs to change. It captures fresh screenshots with Maestro, composes them with the brand type system, and visually verifies the results.
---

# App Store preview generation

Two scripted stages, both deterministic and never hand-edited (repo
convention — same as `generate-brand-assets.ts`):

1. **Capture** — `npm run screenshots`: Maestro drives the dev app
   (`.maestro/marketing/flows/store-screens.yaml`) and drops raw
   1320×2868 screenshots in `.maestro/marketing/raw/`. The runner swaps the
   bundled dataset to the committed synthetic sample first (no personal data,
   no preview banner) and restores it on exit; status bar is pinned to 9:41.
2. **Compose** — `npm run store-previews`
   (`scripts/compose-store-previews.ts`): frames each raw shot in the branded
   canvas — mono eyebrow, Barlow Condensed Black headline with the closing
   phrase in signal red, ink device frame bleeding off the bottom — and emits
   `.maestro/marketing/out/store/{iphone-6.9,iphone-6.5,ipad-13,play-phone,play-tablet-7,play-tablet-10}/NN-*.png`
   at exact accepted store sizes — App Store Connect: 1320×2868, 1284×2778,
   2048×2732; Google Play: 1440×2560, 1080×1920, 2160×3840 (exact 9:16 —
   Play hard-rejects anything beyond 2:1, which rules out the iPhone
   canvases, and wants 9:16 at ≥1080px for promotion eligibility). Also
   emits the Play feature graphic (`feature-graphic-1024x500.png`, pure
   branding, no screenshot). The 6.5" set exists because ASC shows "iPhone
   6.5" Display" as its own required upload bucket, separate from and not
   waived by the 6.9" set. The Play listing icon (512×512) is
   `assets/images/play-icon.png`, from `generate-brand-assets.ts`.

## Workflow

### 1. Preconditions

- **Another session may be running Maestro** — check
  `pgrep -f maestro.cli.AppKt` and wait until free (two runs fight over the
  XCTest driver port and both lose).
- Metro running (`curl -sf localhost:8081/status`), and a **booted iPhone
  17 Pro Max** simulator with the debug app installed. If only another
  simulator has the app, copy it over rather than rebuilding:
  `xcrun simctl install <promax-udid> "$(xcrun simctl get_app_container <other-udid> com.christophermark.wodview)"`.

### 2. Capture + compose

```bash
npm run screenshots      # raw captures (skip if UI unchanged and only copy changed)
npm run store-previews   # branded compositions
```

Compose-only reruns are cheap — iterate copy/layout without recapturing.

### 3. Verify with your eyes — mandatory

Read several output PNGs (at minimum the first slide, one paper slide, and
the type-only closer, plus one iPhone 6.5" file, one iPad file, one Play
file, and the feature graphic). Check:

- headline not clipped or overflowing (auto-fit shrinks oversize lines, but
  confirm), no mangled glyphs;
- screenshots show the **synthetic sample data** (372 WODs, "MURPH",
  "Power Clean 3x5") — never real history, never the red PREVIEW banner;
- screenshots reflect the current UI (stale raws = rerun capture);
- files named `NN-<name>-<WxH>.png` at their device dir's exact size — the
  script hard-fails on any other dimensions.

### 4. Editing the deck

- **Copy/order/colors**: edit `SLIDES` in `scripts/compose-store-previews.ts`
  (segments support the accent-red closing phrase; `bg` is paper/ink/accent).
- **Different screens**: add a `takeScreenshot` to
  `.maestro/marketing/flows/store-screens.yaml` (mind the AGENTS.md Maestro
  gotchas: full-string regex matching, taps swallowed right after
  screenshots, occluded-element leakage) and reference the new raw name in
  `SLIDES`.
- Keep headlines to ~14 characters per line at full size; longer lines
  auto-shrink the whole slide's type.

### 5. Gotchas learned the hard way

- **opentype.js 2.0 corrupts some glyph outlines at fractional pixel sizes**
  (runaway contour blanks the rest of the path). All text must be rendered
  at native em size (`font.unitsPerEm`) and scaled via an SVG transform —
  the helpers in the compose script already do this; don't "simplify" it.
  Fractional **x offsets** into `getPath` trip the same bug (Plex Mono "W"
  at a float-noisy cursor came back all-NaN), so `trackedText` draws every
  glyph at x=0 and positions it with a per-glyph SVG translate.
- App Store Connect rejects PNGs with alpha; the composer strips it.
- The **iPad set is uploadable only if the app ships iPad support**
  (iPhone-only today, `supportsTablet` unset). Generated regardless so it's
  ready — don't try to upload it before then.

### 6. Finish

Run `npm run typecheck && npx eslint scripts/ && npx prettier --check scripts/`
if the script changed. Report which slides changed and why; commit script and
flow changes (never output PNGs — `.maestro/marketing/` outputs are
gitignored).
