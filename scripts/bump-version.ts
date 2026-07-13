#!/usr/bin/env npx tsx
// Bump the app version in lockstep across package.json and app.json (the
// native source of truth — prebuild stamps expo.version into
// CFBundleShortVersionString), reset ios.buildNumber to "1" (App Store
// Connect only requires build numbers to be unique within a version), then
// commit, tag vX.Y.Z, and push.
//
//   npm run version:patch   1.0.0 → 1.0.1
//   npm run version:minor   1.0.0 → 1.1.0
//
// Pass --no-push to stop after the local commit + tag (used by tests).
// Re-uploading the SAME version needs a higher ios.buildNumber instead —
// bump that by hand in app.json (see docs/app-store/README.md).
// The /release skill wraps this with the judgment calls (which bump type,
// what changed, the archive steps that follow).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const kind = args[0];
const push = !args.includes('--no-push');
if (kind !== 'minor' && kind !== 'patch') {
  console.error('usage: bump-version.ts <minor|patch> [--no-push]');
  process.exit(1);
}

const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: ROOT, stdio: 'pipe' }).toString();

// The version commit must contain nothing but the bump: refuse if either
// file already has uncommitted changes (another session may be mid-edit).
if (git('status --porcelain -- package.json app.json').trim() !== '') {
  console.error('package.json or app.json has uncommitted changes — commit or stash them first.');
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

pkg.version = next;
app.expo.version = next;
app.expo.ios.buildNumber = '1';
write('package.json', pkg);
write('app.json', app);
console.log(`${m[0]} → ${next} (ios.buildNumber reset to 1)`);

git(`commit -m "v${next}" -- package.json app.json`);
git(`tag -a "v${next}" -m "WOD View v${next}"`);
console.log(`committed and tagged v${next}`);

if (push) {
  execSync(`git push origin HEAD "v${next}"`, { cwd: ROOT, stdio: 'inherit' });
  console.log(`pushed HEAD and v${next} — next: npm run rebuild:ios, then archive in Xcode.`);
} else {
  console.log('(--no-push: not pushed)');
}
