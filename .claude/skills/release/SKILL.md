---
name: release
description: This skill should be used to cut a WOD View release — write both kinds of release notes (user-facing store notes + internal GitHub notes), bump the version (minor or patch), build both signed store artifacts (IPA + AAB) with the gated Fastlane pipeline, push the tag, publish the GitHub release, and submit to both stores for review (they go live automatically on approval). Trigger on requests like "cut a release", "push a release", "bump the version", "release v1.1", "prepare a new build for the stores". The mechanics are scripted; choosing the bump type and writing the release notes are the model's job.
---

# Cutting a WOD View release

The deterministic core is `scripts/bump-version.ts` (`npm run version:minor`
/ `version:patch`): syncs the version across package.json and app.json,
resets `ios.buildNumber` to "1", increments `android.versionCode`, copies
the new version's whats-new.md section into the fastlane store-notes
metadata files, commits `vX.Y.Z` and tags — **locally only**. Nothing is
pushed until the build proves the tagged commit ships. This skill wraps the
script with the judgment calls and the ordering around it.

**Default outcome:** both stores get the build submitted for review and it
goes live automatically once review passes — no store website visits. Chris
can scope that down per release (see step 7).

## Workflow

### 1. Preconditions

- On `main`, synced with origin, **completely clean worktree** (the bump
  script refuses otherwise). Uncommitted files that aren't yours mean
  another session is mid-flight — coordinate first, don't release.
- Fastlane env configured per `docs/app-store/deployments.md`
  (`fastlane/.env`).
- No Maestro/build contention if screenshots will be regenerated
  (`pgrep -f maestro.cli.AppKt`).
- Did Chris scope this release? "TestFlight only" or "don't submit" changes
  step 7; silence means full submission.

### 2. Choose the bump

```bash
git log "$(git describe --tags --abbrev=0)..HEAD" --oneline
```

New user-facing features → **minor**. Fixes, copy, tooling, docs only →
**patch**. If the log is ambiguous or contains anything Chris might want to
hold back, ask rather than guess.

### 3. Write the release notes, commit them

Two kinds, different audiences — read the guide for each before writing:

- **User-facing** (`user-facing-release-notes.md` in this skill): the new
  version's section at the top of `docs/app-store/whats-new.md` — what a
  user would notice, ≤500 chars, never personal-dataset content. Commit it
  **before** bumping: the bump script copies it into the fastlane metadata
  files (`fastlane/metadata/en-US/release_notes.txt` + the Play changelog)
  and refuses if the section is missing, so the tagged commit carries the
  notes both stores ship.
- **Internal** (`internal-release-notes.md` in this skill): the complete
  record for the GitHub release body in step 6 — draft it now from the same
  commit log; it isn't committed anywhere.

### 4. Bump and tag (local)

```bash
npm run version:minor   # or version:patch
```

Refuses on a dirty tree, if package.json/app.json versions disagree, or if
whats-new.md lacks the new version's section. Produces the `vX.Y.Z` commit
(including the store-notes metadata files) + annotated tag. **Does not
push.**

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
…the internal release notes from step 3…
NOTES
)
```

### 7. Submit to the stores

**Default — full submission, no store websites:**

```bash
npm run deploy:submit
```

iOS uploads the IPA, waits for Apple's processing (~5–30 min), then submits
for App Review with the release notes and releases automatically on
approval. Android uploads the AAB to the production track with the
changelog; it goes live once Play's review passes. Individual halves:
`deploy:submit:ios` / `deploy:submit:android`.

**Scoped-down alternatives** (only when Chris asked for them):

- _TestFlight only:_ `npm run deploy:testflight` — nothing is submitted for
  review on either store. To submit later without re-uploading the binary:
  `bundle exec fastlane ios submit skip_upload:true` plus
  `npm run deploy:submit:android`.
- _Upload but hold:_ `npm run deploy:app-store` and/or `npm run deploy:play`
  (internal track) — binaries land unsubmitted, everything after that is
  manual.

Caveats: until the app's first Play release is live, keep
`PLAY_RELEASE_STATUS=draft` in `fastlane/.env` (the API rejects non-draft
releases before then — a draft still needs one manual Play Console rollout).
Afterward remove it so `submit` releases automatically.

Tell Chris the version, `ios.buildNumber`, `android.versionCode`, what was
submitted where, and anything the release notes flagged.

### 8. Store collateral, if UI changed

If anything store-visible changed, regenerate previews via the
`/store-previews` skill and re-read `docs/app-store/store-listing.md` for
copy that went stale.

## Re-uploading the same version

A rejected/failed upload of the same version needs a higher
`ios.buildNumber` **and** `android.versionCode` in app.json (hand-edit,
commit) — no version bump, no tag, no GitHub release. Also rename the Play
changelog file `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`
to the new versionCode in the same commit (Play matches notes by filename).
App Store Connect rejects duplicate build numbers within a version; Google
Play rejects any versionCode it has ever seen.
