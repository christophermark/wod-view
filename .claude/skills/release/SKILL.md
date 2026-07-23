---
name: release
description: This skill should be used to cut a WOD View release — write the store release notes, bump the version (minor or patch), build both signed store artifacts (IPA + AAB) with the gated Fastlane pipeline, and only then push the tag and publish the GitHub release. Trigger on requests like "cut a release", "bump the version", "release v1.1", "prepare a new build for the stores". The mechanics are scripted; choosing the bump type and writing the release notes are the model's job.
---

# Cutting a WOD View release

The deterministic core is `scripts/bump-version.ts` (`npm run version:minor`
/ `version:patch`): syncs the version across package.json and app.json,
resets `ios.buildNumber` to "1", increments `android.versionCode`, commits
`vX.Y.Z` and tags — **locally only**. Nothing is pushed until the build
proves the tagged commit ships. This skill wraps the script with the
judgment calls and the ordering around it.

## Workflow

### 1. Preconditions

- On `main`, synced with origin, **completely clean worktree** (the bump
  script refuses otherwise). Uncommitted files that aren't yours mean
  another session is mid-flight — coordinate first, don't release.
- Fastlane env configured per `docs/app-store/deployments.md`
  (`fastlane/.env`).
- No Maestro/build contention if screenshots will be regenerated
  (`pgrep -f maestro.cli.AppKt`).

### 2. Choose the bump

```bash
git log "$(git describe --tags --abbrev=0)..HEAD" --oneline
```

New user-facing features → **minor**. Fixes, copy, tooling, docs only →
**patch**. If the log is ambiguous or contains anything Chris might want to
hold back, ask rather than guess.

### 3. Write the release notes, commit them

Add the new version's section to `docs/app-store/whats-new.md` (newest
first), written from the commit log — user-facing changes in the app's
plain, athletic-utilitarian voice. **Never include anything from the
personal dataset** (workout text, dates, scores — the AGENTS.md privacy
rule applies to release notes too). Commit that file before bumping, so the
tagged commit carries the notes that ship.

### 4. Bump and tag (local)

```bash
npm run version:minor   # or version:patch
```

Refuses on a dirty tree or if package.json/app.json versions disagree.
Produces the `vX.Y.Z` commit + annotated tag. **Does not push.**

### 5. Build both store artifacts

```bash
npm run deploy:build
```

Runs the release gates once (Jest, typecheck, `verify:release-bundle` — the
release-blocking personal-data scan of both platforms' bundles), then
builds `build/fastlane/WODView.ipa` and `build/fastlane/WODView.aab` from
the exact tagged commit.

**If the build fails**, nothing has left the machine. Either fix forward
(new commits, then delete and re-create the tag on the fix:
`git tag -d vX.Y.Z` first) or unwind entirely:

```bash
git tag -d vX.Y.Z && git reset --hard HEAD~1
```

### 6. Publish the release

Only now does anything go remote:

```bash
git push origin HEAD "vX.Y.Z"
gh release create "vX.Y.Z" --title "WOD View vX.Y.Z" --notes-file <(cat <<'NOTES'
…the new whats-new.md section…
NOTES
)
```

### 7. Upload — hand off to Chris

The upload decision is his; the artifacts are already built, so these only
upload:

- `npm run deploy:testflight` (recommended first) and/or
  `npm run deploy:app-store` — neither submits for App Review.
- `npm run deploy:play` — internal track; promoting to production (and
  pasting the release notes) happens manually in the Play Console.

Tell him the version, `ios.buildNumber`, `android.versionCode`, and anything
the release notes flagged.

### 8. Store collateral, if UI changed

If anything store-visible changed, regenerate previews via the
`/store-previews` skill and re-read `docs/app-store/store-listing.md` for
copy that went stale.

## Re-uploading the same version

A rejected/failed upload of the same version needs a higher
`ios.buildNumber` **and** `android.versionCode` in app.json (hand-edit,
commit) — no version bump, no tag, no GitHub release. App Store Connect
rejects duplicate build numbers within a version; Google Play rejects any
versionCode it has ever seen.
