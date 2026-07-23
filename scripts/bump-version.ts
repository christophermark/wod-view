#!/usr/bin/env npx tsx
// Bump the app version in lockstep across package.json and app.json (the
// native source of truth — prebuild stamps expo.version into
// CFBundleShortVersionString and versionName), reset ios.buildNumber to "1"
// (App Store Connect only requires build numbers to be unique within a
// version), increment android.versionCode (Google Play requires it to
// increase across ALL uploads, forever — it never resets), copy the new
// version's whats-new.md section into the fastlane store-release-notes
// metadata files, then commit and tag vX.Y.Z locally.
//
//   npm run version:patch   1.0.0 → 1.0.1
//   npm run version:minor   1.0.0 → 1.1.0
//
// Deliberately does NOT push: the tag is published (git push + GitHub
// release) only after `npm run deploy:build` proves the tagged commit
// actually builds, so a failed archive never leaves a remote tag for a
// build that doesn't exist. The /release skill wraps this with the
// judgment calls (bump type, release notes, the ordering around it).
//
// Re-uploading the SAME version needs a higher ios.buildNumber and
// android.versionCode instead — bump those by hand in app.json (see
// docs/app-store/deployments.md).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const kind = process.argv[2];
if (kind !== 'minor' && kind !== 'patch') {
  console.error('usage: bump-version.ts <minor|patch>');
  process.exit(1);
}

const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, stdio: 'pipe' }).toString();

// The version commit must contain nothing but the bump, and the tag must
// point at a tree that can be rebuilt verbatim: refuse unless the entire
// worktree is clean (another session may be mid-edit).
if (git('status --porcelain').trim() !== '') {
  console.error('worktree is not clean — commit or stash everything first:');
  console.error(git('status --porcelain'));
  process.exit(1);
}

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const write = (f: string, obj: unknown) =>
  fs.writeFileSync(path.join(ROOT, f), JSON.stringify(obj, null, 2) + '\n');

const pkg = read('package.json');
const app = read('app.json');

if (pkg.version !== app.expo.version) {
  console.error(
    `version mismatch: package.json ${pkg.version} vs app.json ${app.expo.version} — fix by hand first`,
  );
  process.exit(1);
}

const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!m) {
  console.error(`unparseable version: ${pkg.version}`);
  process.exit(1);
}
const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
const next = kind === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
const nextVersionCode = (app.expo.android.versionCode ?? 0) + 1;

// The user-facing notes for the new version must already be committed in
// whats-new.md (so the tagged commit carries the notes that ship). Copy the
// section verbatim into the fastlane metadata files that deliver (App Store)
// and supply (Google Play) upload — one source, identical on both stores.
const whatsNew = fs.readFileSync(path.join(ROOT, 'docs/app-store/whats-new.md'), 'utf8');
const section = whatsNew.split(/^## /m).find((s) => s.startsWith(`v${next}\n`));
const notes = section?.slice(section.indexOf('\n') + 1).trim() ?? '';
if (!notes) {
  console.error(
    `docs/app-store/whats-new.md has no "## v${next}" section — write and commit the ` +
      'user-facing release notes first (.claude/skills/release/user-facing-release-notes.md)',
  );
  process.exit(1);
}
if (notes.length > 500) {
  console.error(
    `release notes are ${notes.length} chars — Google Play caps changelogs at 500 and both ` +
      'stores ship the same text, so tighten the whats-new.md section first',
  );
  process.exit(1);
}
const noteFiles = [
  'fastlane/metadata/en-US/release_notes.txt',
  `fastlane/metadata/android/en-US/changelogs/${nextVersionCode}.txt`,
];
for (const f of noteFiles) {
  fs.mkdirSync(path.join(ROOT, path.dirname(f)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, f), notes + '\n');
}

pkg.version = next;
app.expo.version = next;
app.expo.ios.buildNumber = '1';
app.expo.android.versionCode = nextVersionCode;
write('package.json', pkg);
write('app.json', app);
console.log(
  `${m[0]} → ${next} (ios.buildNumber reset to 1, android.versionCode → ${nextVersionCode})`,
);
console.log(`store release notes → ${noteFiles.join(', ')}`);

git(`commit -m "v${next}" -- package.json app.json fastlane/metadata`);
git(`tag -a "v${next}" -m "WOD View v${next}"`);
console.log(`committed and tagged v${next} (not pushed)`);
console.log('next: npm run deploy:build, then push HEAD and the tag once it succeeds.');
