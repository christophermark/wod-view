# WOD View — app intent & ground truths

Single source of truth for the durable product facts that tend to drift across
docs, store listings, and marketing copy. When any of these change, update this
file in the same change, then sweep the places listed at the bottom.

## What the app is

A personal, private, on-device archive for your own workout history. You bring
the workout-history export from your previous gym app, WOD View parses it on
your phone, and it becomes a searchable log, calendar, and lifetime stats
dashboard. No accounts, no servers, no analytics, no subscription.

## Ground truths

- **Platforms:** iOS **and** Android, released to both the App Store and
  Google Play. Phone-first; no iPad/tablet UI yet (`supportsTablet` unset).
- **Import sources:** **SugarWOD** and **Chalk It Pro** (exact branding —
  "Chalk It Pro" with spaces; chalkitpro.com stylizes it CHALK IT PRO in store
  listings). Every surface names both — store listings, website, and in-app
  import screens (since 2026-07-23); the step-by-step export walkthrough stays
  SugarWOD-focused with a Chalk It Pro note. Never use "CrossFit" anywhere
  (trademark; see `docs/app-store/store-listing.md`).
- **Store listings:** App Store —
  https://apps.apple.com/us/app/wodview/id6790285943 (live). Google Play —
  **in closed testing** as of 2026-07-23; the opt-in link is
  https://play.google.com/apps/testing/com.christophermark.wodview, and the
  public listing will be
  https://play.google.com/store/apps/details?id=com.christophermark.wodview.
  **Reminder for Chris:** once the app is live on Play, swap the marketing
  page's Google Play button (and this bullet) to the public listing URL.
- **Website:** https://www.christophermark.me/wodview — the `/wodview/…`
  namespace is canonical (not `/wod-view/…`, and not GitHub Pages, which is
  retired to redirect stubs in `docs/privacy/` and `docs/support/`). Pages:
  `/wodview`, `/wodview/privacy`, `/wodview/support`, `/wodview/sample-data`.
  Source lives in the `~/dev/christophermark.me` Next.js repo.
- **Developer contact email:** **chrismarklabs@gmail.com** (history: two
  earlier addresses were wrong — see decision log 2026-07-12 / 2026-07-22).
- **Privacy stance:** "Data Not Collected." Nothing leaves the device; the
  only outbound touch is the user-tapped SugarWOD help link. Any dependency
  that phones home invalidates the store privacy answers _and_ the policy page.
- **Design:** "clean athletic light" — paper background, ink Barlow Condensed
  display type, signal-red accent, IBM Plex Mono for measured values. Light
  mode only.

## Where these facts surface (sweep list)

- `AGENTS.md` (intro + hosting pointer)
- `README.md`
- `docs/app-store/store-listing.md`, `review-notes.md`, `README.md`
- App Store Connect / Play Console fields (manual — URLs, contact email)
- Store preview slide copy (`scripts/compose-store-previews.ts`)
- The personal-site pages (`~/dev/christophermark.me/app/wodview/…`)
- Decision log (`docs/app-store/decision-log.md`) — record the change
