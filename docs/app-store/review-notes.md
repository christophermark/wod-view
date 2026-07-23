# App Review notes (paste into App Store Connect → App Review Information)

> WOD View is a viewer for a user's own workout-history export (a CSV file
> that gym-workout services — SugarWOD and Chalk It Pro are supported —
> email to their users on request). There are no accounts and no login —
> all data is imported by the user and stored only on-device.
>
> TO REVIEW WITH A POPULATED APP (no export file needed):
>
> 1. Launch the app. On the welcome screen, tap "GET STARTED ›".
> 2. On the "LOAD YOUR LOG" screen, tap "TRY PREVIEW MODE ›".
> 3. The app loads three years of built-in sample data. All features work:
>    the LOG tab (browse + search workouts, open any workout for detail),
>    the CALENDAR tab (attendance by month), the STATS tab (lifetime
>    numbers, PRs, lift bests), and Settings.
> 4. A red "PREVIEW MODE · SAMPLE DATA" banner stays visible at the top;
>    tapping EXIT returns to the welcome screen.
>
> The real import path (welcome screen → "IMPORT workouts.csv…") opens the
> system file picker for the CSV export; the app detects which service's
> format it is and parses it on-device.
> The app makes no network requests; the only outbound touch is a help
> button that opens SugarWOD's public help page in an in-app browser view.
>
> Demo account: not applicable (no accounts exist in the app).

## Contact info for the review form

- First name / last name: Christopher Mark
- Email: chrismarklabs@gmail.com (must be reachable during review)
- Phone: ← Chris to fill in

## Guideline risk assessment

- **4.2 Minimum functionality:** low risk. The app is not a thin wrapper or
  a single-purpose utility: it ships parsing with heuristic line-break
  restoration, full-text search, a calendar view, and a stats engine, all
  offline. Preview mode means the reviewer sees a rich, populated app in two
  taps — the review notes lead them straight there.
- **2.1 App completeness:** preview mode ensures the reviewer never sees an
  empty app. Verified end-to-end in a production-configuration build before
  submission (see submission checklist).
- **5.2.1 Third-party content/marks:** the app displays only the user's own
  data; SugarWOD is referenced as a compatible data source with a
  non-affiliation disclaimer. See trademark notes in store-listing.md.
