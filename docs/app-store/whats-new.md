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

## v1.0.3

Tab bar and settings icons now render correctly on every device. Settings is reachable from every tab, and the tabs run LOG · STATS · CALENDAR. Stats also read your history more accurately — more movements and spellings are recognized, and accessory lifts like snatch pulls and clean pulls now get their own pages instead of skewing the maxes on the parent lift.

## v1.0.2

Onboarding now starts with a working app: explore three years of sample data — log, calendar, and stats — before importing your own history. When you're ready, the sample-data banner jumps straight to import. Also fixed: the least-programmed stat now only ranks movements that actually appear in your log.

## v1.0.1

Chalk It Pro exports are now supported alongside SugarWOD — import either from the same screen. Small copy fixes and polish.

## v1.0.0

Initial release. Import your SugarWOD export and own your training history —
the log, the calendar, the stats, all on-device.
