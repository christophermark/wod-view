# App Store submission — status and checklist

State of the App Store readiness work. Files here:

- `store-listing.md` — every App Store Connect field, ready to paste.
- `review-notes.md` — App Review notes + guideline risk assessment.
- `decision-log.md` — why each call was made.
- `screenshots.md` — the repeatable marketing-screenshot pipeline.

## Done (no action needed)

- [x] `app.json`: `userInterfaceStyle: "light"`, `ITSAppUsesNonExemptEncryption: false`
- [x] `eas.json`: production build (auto-incrementing build numbers) + submit profiles
- [x] Privacy policy live: https://christophermark.github.io/wod-view/privacy/
- [x] Support page live: https://christophermark.github.io/wod-view/support/
- [x] Store listing copy, keywords, category, age-rating answers (store-listing.md)
- [x] App Review notes with the preview-mode walkthrough (review-notes.md)
- [x] Marketing screenshot pipeline (`npm run screenshots`, screenshots.md)
- [x] Production bundle verified free of personal data (`npm run verify:release-bundle`)
- [x] Preview/review path verified in a Release-configuration build (onboarding →
      preview → all tabs; no dev UI; banner EXIT returns to onboarding)

## Needs Chris (in order)

1. **Apple Developer Program** — confirm enrollment is active for the Apple ID
   that will publish. If not enrolled: https://developer.apple.com/programs/enroll/
   ($99/yr, can take a day or two to clear). _Everything below waits on this._
2. **Expo account** — `npm i -g eas-cli && eas login`, then in the repo run
   `eas init` (links the project, writes `projectId` into app.json — commit that).
3. **Create the app record** in App Store Connect (My Apps → “+” → New App):
   platform iOS, name **WOD View**, primary language English (U.S.), bundle ID
   `com.christophermark.wodview` (register it in the developer portal if the
   picker doesn't offer it — `eas build` can also do this automatically),
   SKU e.g. `wodview-001`. This is the moment the name is actually reserved.
4. **Fill your phone number** into the App Review contact fields (the public
   contact email is chrismarkapps@gmail.com, confirmed 2026-07-12, already on
   the privacy/support pages).
5. **Build & upload:** `eas build --platform ios --profile production` then
   `eas submit --platform ios` (first run walks through App Store Connect auth).
6. **Fill in App Store Connect** from `store-listing.md` (all fields), upload
   screenshots from `.maestro/marketing/out/`, answer the privacy
   questionnaire ("no data collected") and age rating questionnaire (all
   None/No), paste `review-notes.md` into App Review Information.
7. **Pre-submit gate (run locally):** `npm run verify:release-bundle` must
   pass against the exact commit being built.
8. **Submit for review** — the one step that stays manual on purpose.

## Standing release rules

- Any new dependency that phones home (analytics, crash reporting,
  expo-updates) invalidates the "Data Not Collected" privacy answer and the
  privacy policy — both must be updated before that build ships.
- `npm run verify:release-bundle` is the release-blocking check that no
  personal workout data is in the production JS bundle. Run it before every
  `eas build`.
