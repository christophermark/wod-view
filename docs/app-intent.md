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
  listings). Store listings and the website name both. In-app import copy
  deliberately mentions only SugarWOD (Chris's call — revisit only when he
  says so). Never use "CrossFit" anywhere (trademark; see
  `docs/app-store/store-listing.md`).
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
