---
name: release
description: This skill should be used to cut a WOD View release — bump the version (minor or patch), tag and push it, publish a GitHub release with notes, and run the gated iOS rebuild so the app is ready to archive in Xcode. Trigger on requests like "cut a release", "bump the version", "release v1.1", "prepare a new build for the store". The mechanics are scripted; choosing the bump type and writing the release notes are the model's job.
---

# Cutting a WOD View release

The deterministic core is `scripts/bump-version.ts` (`npm run version:minor`
/ `version:patch`): syncs the version across package.json and app.json,
resets `ios.buildNumber` to "1", commits `vX.Y.Z`, tags, and pushes. This
skill wraps it with the judgment calls and the steps around it.

## Workflow

### 1. Preconditions

- On `main`, synced with origin. **Check for another session's in-flight
  work** (`git status` — uncommitted files that aren't yours mean don't
  release; coordinate first).
- No Maestro/build contention if screenshots will be regenerated
  (`pgrep -f maestro.cli.AppKt`).

### 2. Choose the bump

```bash
git log "$(git describe --tags --abbrev=0)..HEAD" --oneline
```

New user-facing features → **minor**. Fixes, copy, tooling, docs only →
**patch**. If the log is ambiguous or contains anything Chris might want to
hold back, ask rather than guess.

### 3. Bump, tag, push

```bash
npm run version:minor   # or version:patch
```

Refuses if package.json/app.json have uncommitted changes or the two
versions disagree. Produces the `vX.Y.Z` commit + annotated tag and pushes
both.

### 4. GitHub release with notes

Write the notes from the commit log since the previous tag — user-facing
changes first, in the app's plain, athletic-utilitarian voice; tooling/infra
in a short trailing section. **Never include anything from the personal
dataset** (workout text, dates, scores — the AGENTS.md privacy rule applies
to release notes too). Then:

```bash
gh release create "vX.Y.Z" --title "WOD View vX.Y.Z" --notes-file <(cat <<'NOTES'
…
NOTES
)
```

### 5. Gated native rebuild

```bash
npm run rebuild:ios
```

Runs jest + typecheck + `verify:release-bundle` (the release-blocking
personal-data scan) before regenerating `ios/` with CocoaPods. Must pass on
the exact tagged commit.

### 6. Hand off to Chris

The archive/upload steps are his (Apple ID): Xcode → Product → Archive →
Organizer → Distribute App, then App Store Connect — full checklist in
`docs/app-store/README.md` steps 5–8. Tell him the version/build being
shipped and anything the release notes flagged.

### 7. Store collateral, if UI changed

If anything store-visible changed, regenerate previews via the
`/store-previews` skill and re-read `docs/app-store/store-listing.md` for
copy that went stale.

## Re-uploading the same version

A rejected/failed upload of the same version needs a **higher
`ios.buildNumber`** in app.json (hand-edit, commit) — no version bump, no
tag, no GitHub release. App Store Connect rejects duplicate build numbers
within a version.
