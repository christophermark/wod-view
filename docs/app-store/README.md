# App Store submission — status and checklist

State of the App Store readiness work. Files here:

- `store-listing.md` — every App Store Connect field, ready to paste.
- `review-notes.md` — App Review notes + guideline risk assessment.
- `decision-log.md` — why each call was made.
- `screenshots.md` — the repeatable marketing-screenshot pipeline.

## Done (no action needed)

- [x] `app.json`: `userInterfaceStyle: "light"`, `ITSAppUsesNonExemptEncryption: false`,
      `ios.buildNumber` (bump per upload — see rules below)
- [x] Privacy policy live: https://christophermark.github.io/wod-view/privacy/
- [x] Support page live: https://christophermark.github.io/wod-view/support/
- [x] Store listing copy, keywords, category, age-rating answers (store-listing.md)
- [x] App Review notes with the preview-mode walkthrough (review-notes.md)
- [x] Branded store previews (`npm run screenshots` + `npm run store-previews`,
      or the `/store-previews` skill; screenshots.md)
- [x] Production bundle verified free of personal data (`npm run verify:release-bundle`)
- [x] Preview/review path verified in a Release-configuration build (onboarding →
      preview → all tabs; no dev UI; banner EXIT returns to onboarding)

## Build pipeline: local Fastlane (chosen 2026-07-22)

Supersedes the 2026-07-12 "local Xcode archive" choice. Chris builds locally. The primary path is the gated Fastlane pipeline in
`deployments.md` — `npm run deploy:build` produces both signed store
artifacts, and the upload lanes push them to TestFlight / App Store
Connect / Google Play without ever submitting for review. The Xcode
Organizer flow below remains the manual iOS fallback. `ios/` is
disposable generated output (gitignored): regenerate it, never hand-edit it;
every native setting lives in `app.json`. `eas.json` stays in the repo as a
working fallback (`eas build -p ios --profile production` + `eas submit`)
should cloud builds ever be preferable; note EAS's remote build numbers are
ignored by local builds — `ios.buildNumber` in app.json is the source of
truth for this path.

## Needs Chris (in order)

1. **Apple Developer Program** — confirm enrollment is active for the Apple ID
   that will publish. If not enrolled: https://developer.apple.com/programs/enroll/
   ($99/yr, can take a day or two to clear). _Everything below waits on this._
2. **Sign Xcode in** — Xcode → Settings → Accounts → add that Apple ID; the
   team should appear. Automatic signing handles certs/profiles from there.
3. **Create the app record** in App Store Connect (My Apps → “+” → New App):
   platform iOS, name **WOD View**, primary language English (U.S.), bundle ID
   `com.christophermark.wodview` — register it first at
   developer.apple.com → Identifiers (or archive once with your team selected;
   automatic signing registers it). SKU e.g. `wodview-001`. This is the
   moment the name is actually reserved.
4. **Gate + generate the native project:**
   `npm run rebuild:ios`
   — npm's `prerebuild:ios` hook first runs `npm test`, `npm run typecheck`,
   and `npm run verify:release-bundle` (the release-blocking personal-data
   check), then expo prebuild `--clean` regenerates `ios/` from app.json and
   runs CocoaPods, guaranteeing config like the encryption key and
   light-mode lock is baked in. Run it on the exact commit being archived.
   (To skip the gates during ordinary development, call
   `npx expo prebuild -p ios --clean` directly.)
5. **Archive & upload:** `open ios/WODView.xcworkspace` → select the WODView
   scheme + destination "Any iOS Device (arm64)" → Signing & Capabilities:
   confirm your team + automatic signing → Product → Archive → in the
   Organizer: Distribute App → App Store Connect → Upload. The Release JS
   bundle embeds automatically (Metro not needed); the export-compliance
   question is pre-answered by `ITSAppUsesNonExemptEncryption`. Wait for the
   "processing complete" email (~15 min).
6. **Fill in App Store Connect** from `store-listing.md` (all fields), upload
   screenshots from `.maestro/marketing/out/store/iphone-6.9/` **and**
   `iphone-6.5/` — ASC treats these as separate required buckets, the 6.9"
   set does not auto-cover the 6.5" one — answer the
   privacy questionnaire ("no data collected") and age rating questionnaire
   (all None/No), paste `review-notes.md` into App Review Information plus
   your phone number, attach the processed build to the 1.0 version.
7. **Optional but recommended:** TestFlight-install on your own phone and
   run the reviewer path once (onboarding → preview → tabs → import your
   real CSV).
8. **Submit for review** — the one step that stays manual on purpose.

## Standing release rules

- Any new dependency that phones home (analytics, crash reporting,
  expo-updates) invalidates the "Data Not Collected" privacy answer and the
  privacy policy — both must be updated before that build ships.
- `npm run verify:release-bundle` is the release-blocking check that no
  personal workout data is in the production JS bundle. Run it before every
  store build.
- **Every upload needs a higher `ios.buildNumber`** in app.json (App Store
  Connect rejects duplicates for the same version). Bump it there — not in
  Xcode, where `prebuild --clean` would erase it — and commit the bump.
- **New versions ship via the `/release` skill** (or by hand:
  `npm run version:minor` / `version:patch`, which sync both files, reset
  the build number, commit, tag `vX.Y.Z`, and push; the skill adds the
  judgment — bump type, GitHub release notes — plus the gated rebuild).
