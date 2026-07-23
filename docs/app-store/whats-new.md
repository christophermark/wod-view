# What's new — user-facing store release notes

The "What's New" text shown to users in both stores, one section per
release, newest first. Written **before** the version bump: the bump script
copies the new version's section verbatim into
`fastlane/metadata/en-US/release_notes.txt` (App Store) and
`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` (Google
Play), so the tagged commit carries the notes that ship and both stores
always get identical text. Keep each section ≤500 characters (the Play cap
— the bump refuses otherwise).

These notes are **user-facing**: only what a user would notice, in the
plain, athletic-utilitarian voice of the store listing — see
`.claude/skills/release/user-facing-release-notes.md`. Internal changes
(tooling, build system, refactors) belong in the GitHub release body
instead (`.claude/skills/release/internal-release-notes.md`). Never include
anything from the personal dataset (the AGENTS.md privacy rule applies here
too).

## v1.0.1

Chalk It Pro exports are now supported alongside SugarWOD — import either from the same screen. Small copy fixes and polish.

## v1.0.0

Initial release. Import your SugarWOD export and own your training history —
the log, the calendar, the stats, all on-device.
