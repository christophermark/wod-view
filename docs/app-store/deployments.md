# Store deployments (Fastlane)

Fastlane is the local-first deployment path for WOD View, covering both
stores. The model is **build once, upload separately**:

- `npm run deploy:build` regenerates the disposable native projects, runs the
  release gates once, and produces both signed artifacts:
  `build/fastlane/WODView.ipa` and `build/fastlane/WODView.aab`.
- The upload and submit commands (`deploy:submit`, `deploy:testflight`,
  `deploy:app-store`, `deploy:play`) only upload those exact artifacts —
  they never rebuild, and they refuse to run if the artifact is missing.
- `npm run deploy:submit` is the default release path: it submits both
  stores for review with the release notes, and each release goes live
  automatically once its review passes — no store website visits. The
  upload-only commands remain for TestFlight-only releases or for holding
  a build back from review.

The release gates are Jest, TypeScript, and `npm run verify:release-bundle`
(the release-blocking scan proving the personal dataset is absent from both
platforms' production JS bundles).

## One-time setup — shared

1. Install the Ruby version in `.ruby-version` (rbenv is fine), then install
   the locked gems:

   ```sh
   bundle install
   ```

2. Copy the environment template and fill it in as you complete the platform
   setup below. Fastlane loads it automatically on every lane:

   ```sh
   cp fastlane/.env.default fastlane/.env   # fastlane/.env is gitignored
   ```

Never commit credentials. `fastlane/.env`, `*.p8`, `*.keystore`, `*.jks`, and
`fastlane/*.json` are all ignored as a last line of defense, but the
recommended location for key material is outside the checkout entirely.

## One-time setup — iOS

1. Sign in to the publishing Apple ID in Xcode and confirm the distribution
   certificate is available. Fastlane uses Xcode automatic signing; it does
   not store certificates or provisioning profiles in this repository.
2. In App Store Connect, create a team API key under Users and Access →
   Integrations (App Manager role is sufficient). Keep the downloaded `.p8`
   outside the repository; fill in `APPLE_TEAM_ID`, `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, and `ASC_KEY_PATH` in `fastlane/.env`. `APPLE_TEAM_ID` is
   the 10-character Developer Portal team ID, not the numeric ASC team ID.
3. Create the WOD View app record in App Store Connect before the first
   upload. Its bundle ID must be `com.christophermark.wodview`.

## One-time setup — Android

1. Prerequisites: Android Studio (its bundled JDK is used automatically when
   `JAVA_HOME` is unset) and the Android SDK (`~/Library/Android/sdk`).
2. Generate the **upload keystore** and keep it outside the repository.
   Google Play signs the app it ships (Play App Signing); this key only
   authenticates uploads, but losing it still means a support ticket — back
   it up somewhere safe:

   ```sh
   mkdir -p ~/.keystores/wodview
   keytool -genkeypair -v \
     -keystore ~/.keystores/wodview/wodview-upload.keystore \
     -alias wodview-upload -keyalg RSA -keysize 2048 -validity 10000
   ```

   Fill in the four `WODVIEW_ANDROID_*` values in `fastlane/.env`.

3. In the [Play Console](https://play.google.com/console) (one-time $25
   developer registration), create the app: name **WOD View**, package
   `com.christophermark.wodview`, free, and work through the app-content
   questionnaires (privacy policy URL, data-safety form — "no data
   collected", same answers as the Apple privacy questionnaire in
   `store-listing.md`).
4. **First upload is manual:** run `npm run deploy:build:android`, then
   upload `build/fastlane/WODView.aab` in the Play Console (Internal testing
   → Create release). This enrolls the app in Play App Signing and registers
   the upload key. Every upload after that can go through `deploy:play`.
5. Give Fastlane a service account it can upload as. A service account is a
   per-developer-account credential, not a per-app one: an existing account
   already linked to the Play Console (e.g. from another app) can simply be
   granted WOD View under Users and permissions → the account → App
   permissions → Add app, with "Release apps to testing tracks" and
   "Release to production". Otherwise create one in Google Cloud (IAM →
   Service Accounts → create + JSON key) and invite it in the Play Console
   with those grants. Save the JSON outside the repository and set
   `GOOGLE_PLAY_JSON_KEY_PATH` in `fastlane/.env`. Until the app's first
   Play release is actually live, also set `PLAY_RELEASE_STATUS=draft` — the
   API rejects non-draft releases before then.

## Commands

```sh
# Build both signed store artifacts (gates run once):
#   build/fastlane/WODView.ipa + build/fastlane/WODView.aab
npm run deploy:build

# Or one platform at a time
npm run deploy:build:ios
npm run deploy:build:android

# DEFAULT RELEASE PATH — submit both stores for review; each goes live
# automatically once its review passes (iOS: upload + wait for processing +
# submit with automatic release; Android: production track with changelog)
npm run deploy:submit

# Or one store at a time
npm run deploy:submit:ios
npm run deploy:submit:android

# --- Scoped-down alternatives (nothing below submits for review) ---

# Upload the built IPA to TestFlight only (processing/distribution stays in ASC)
npm run deploy:testflight

# Upload the built IPA to App Store Connect (binary only; hold for review)
npm run deploy:app-store

# Upload the built AAB to Google Play's internal track only
npm run deploy:play
```

If the IPA was already uploaded (e.g. a TestFlight-only release being
promoted later), submit without re-uploading:
`bundle exec fastlane ios submit skip_upload:true`.

Every build command requires a completely clean Git worktree and runs the
release gates before regenerating `ios/` / `android/` with
`expo prebuild --clean`. The upload commands warn if the artifact is older
than the HEAD commit (a stale build from before your latest changes).

## Release behavior

- Versioning is handled by `npm run version:minor` / `version:patch`
  (`scripts/bump-version.ts`): bumps `expo.version` in lockstep with
  package.json, resets `ios.buildNumber` to "1", increments
  `android.versionCode`, commits and tags locally **without pushing** — the
  tag is pushed only after `deploy:build` proves the commit builds. The
  `/release` skill orchestrates the whole sequence.
- Re-uploading the **same version** (rejected/failed upload) needs a higher
  `ios.buildNumber` and `android.versionCode` in app.json — hand-edit and
  commit; no tag, no version bump. Rename the Play changelog file
  (`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`) to match
  the new versionCode in the same commit. ASC rejects duplicate build
  numbers within a version; Play rejects any versionCode it has ever seen.
- `deploy:submit:ios` uploads the IPA, waits for Apple's processing
  (~5–30 min), then submits for App Review with the release notes,
  auto-answered compliance questions (no IDFA, no third-party content,
  exempt encryption via app.json), and automatic release on approval. It
  touches no other listing metadata, screenshots, or pricing.
- `deploy:submit:android` uploads the AAB to the **production** track with
  the versionCode's changelog. Play reviews it automatically and it goes
  live on approval (managed publishing must stay off, which is the
  default). Until the app's first Play release is live, keep
  `PLAY_RELEASE_STATUS=draft` set — the API rejects non-draft releases
  before then, and a draft still needs one manual rollout in the Play
  Console. Remove it once live.
- `deploy:testflight` returns without waiting for Apple's processing. Select
  tester groups in App Store Connect.
- `deploy:app-store` uploads only the binary — no listing copy, screenshots,
  pricing, or review submission.
- `deploy:play` uploads only the AAB to the internal track — no listing
  metadata, no changelog.
- User-facing store release notes live in `docs/app-store/whats-new.md`,
  committed before the version bump; the bump copies the new section into
  the `fastlane/metadata/` files both submit lanes read, so the tagged
  commit carries the notes that shipped and both stores get identical
  text. Internal release notes go in the GitHub release body only (see the
  guides in `.claude/skills/release/`).

## Fallbacks and troubleshooting

- Xcode Organizer remains the manual iOS fallback: `npm run rebuild:ios`,
  open `ios/WODView.xcworkspace`, archive, upload.
- EAS Build/Submit remains the cloud fallback configured in `eas.json`.
- If automatic iOS signing fails, open the generated workspace once and
  verify the team under Signing & Capabilities. Do not edit generated native
  settings as a permanent fix; native configuration belongs in `app.json` or
  the Fastlane build options.
- If Gradle fails with a JDK/toolchain error, the Homebrew `java` on PATH is
  probably too new — point `JAVA_HOME` in `fastlane/.env` at Android
  Studio's bundled JDK (the Fastfile already falls back to it when
  `JAVA_HOME` is unset).
