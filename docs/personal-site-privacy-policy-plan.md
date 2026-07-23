# Plan: move the WOD View privacy policy onto Chris's personal site

> Self-contained brief, same convention as `docs/features/`. Paste it (or
> point a session at this file) when starting the work — likely a session
> running in the personal site's repo, not this one. That session may read
> this project locally at `/Users/chris/dev/wod-view` for source content.

## Why

The privacy policy and support pages currently live on GitHub Pages off this
repo (`main:/docs` → https://christophermark.github.io/wod-view/privacy/ and
`…/support/`). That was the zero-infrastructure option to unblock App Store
submission. Long-term, Chris wants them on his personal site: a domain he
owns, one home for all his app pages, and no dependency on this repo's
hosting config. Apple requires the privacy policy URL (and a support URL) for
every app version, so the URL that ships in App Store Connect should be the
one that's meant to last.

## Source of truth (in this repo)

- `docs/privacy/index.html` — the complete, current policy. Plain-language,
  already accurate: local-only data model, "Data Not Collected" label, the
  one outbound help link, deletion story, effective date, contact.
- `docs/support/index.html` — the support page (export steps, common
  issues, contact). Port it in the same pass: App Store Connect wants both
  URLs, and they cross-link.
- Brand tokens if the site wants the WOD View look for these pages:
  `src/theme.ts` (paper `#F6F4EE`, ink `#16130D`, accent `#E8391D`,
  hairline `#E7E3D8`; Barlow / Barlow Condensed / IBM Plex Mono). Both HTML
  files are self-contained (inline CSS, no external requests) and can be
  lifted nearly verbatim if the site serves static HTML.
- Contact email everywhere: **chrismarklabs@gmail.com**.

## The work

1. **Discover the site.** Find the personal site's repo, stack (static/
   Next/Astro/…), hosting, and domain. Nothing below is decidable before
   this; adapt file formats to whatever the site uses.
2. **Pick durable URLs.** Recommendation: namespace per app so future apps
   slot in — `https://<domain>/apps/wod-view/privacy/` and
   `…/apps/wod-view/support/`. Whatever is chosen, treat it as permanent:
   this string goes into App Store Connect and into shipped app builds if
   the app ever links its own policy.
3. **Port both pages.** Keep the content substantively identical — the
   policy's claims are load-bearing (they must match the App Privacy
   questionnaire answers). Keep: the "collects no data" summary card, the
   outbound-link disclosure, deletion instructions, children/changes
   sections, the effective date, and the SugarWOD/Chalk It Pro
   non-affiliation line. Style is free: adopt the site's chrome or keep the
   WOD View brand block. No analytics/trackers on the privacy page itself —
   a policy that says "no tracking" must not set cookies to say it.
4. **Verify reachability like Apple will:** public, no auth, loads over
   HTTPS, works without JavaScript (App Review fetches these URLs).
5. **Switch the references in this repo** (wod-view):
   - `docs/app-store/store-listing.md` → new privacy + support URLs.
   - `docs/app-store/README.md` checklist and `AGENTS.md` pointer.
   - If App Store Connect fields are already filled by then, update them
     too (privacy URL is per-version; support URL is app-level).
6. **Retire GitHub Pages gracefully.** Replace the two Pages files with
   minimal redirect stubs (`<meta http-equiv="refresh">` + a link) to the
   new URLs — old links keep working, and there is exactly one canonical
   copy. Log the switch in `docs/app-store/decision-log.md`.

## Standing rule (unchanged from AGENTS.md)

The policy must stay true to the app. Any dependency that phones home
(analytics, crash reporting, expo-updates) invalidates both the policy text
and the "Data Not Collected" answer — whichever site hosts the policy, that
rule travels with it, including bumping the effective date on any change.

## Done when

- Both pages live on the personal domain, HTTPS, publicly reachable.
- This repo and (if applicable) App Store Connect point at the new URLs.
- GitHub Pages URLs redirect to the new home.
