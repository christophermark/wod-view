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
- **One text for both stores.** Don't write platform-specific notes unless a
  change genuinely shipped on only one platform — then say so in the shared
  text rather than diverging the files.
