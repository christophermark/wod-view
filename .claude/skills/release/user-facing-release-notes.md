# Writing the user-facing release notes

These are the "What's New" notes shown in the App Store and Google Play (and
someday perhaps inside the app). They live as the newest section of
`docs/app-store/whats-new.md`; the version bump copies that section verbatim
into the fastlane metadata files, so both stores always ship identical text.

This is a judgment call, not a template. The principles below matter more
than any particular format — use taste, and let the release's actual content
shape the notes.

- **Audience: a person deciding whether to update.** Include only what a
  user could notice: new features, visible fixes, performance they'd feel.
  Build system, tooling, refactors, CI, dependency bumps, docs — none of it
  belongs here, no matter how much work it was. A release that's all
  internal work gets a short honest line ("Small fixes and polish").
- **Voice:** plain, athletic-utilitarian — the store listing's voice. Say
  what changed, not how clever it was. No marketing froth, no exclamation
  marks, no "we".
- **Hard limits:** ≤500 characters (Google Play's cap; the bump script
  refuses beyond it). Never include anything from the personal dataset —
  workout text, dates, scores (the AGENTS.md privacy rule applies here).
- **One text for both stores, and never name a platform in it.** No "iOS",
  "Android", "iPhone vs. Android", "on Android only". Apple's precheck flags
  the other platform's name in App Store metadata (observed on v1.0.3) and
  it's a metadata-rejection risk; beyond that, a reader on one store has no
  use for the other store's news. This holds even when the fix genuinely
  shipped on one platform only — describe what's now true for the reader
  instead of where it was broken:

  > _Android: the tab bar and settings icons are visible again._ →
  > **Tab bar and settings icons now render correctly on every device.**

  Platform detail belongs in the GitHub release body, where naming iOS and
  Android freely is correct and useful — see `internal-release-notes.md`.
  Diverging the two stores' files is a last resort, not the way around this.
