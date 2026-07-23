#!/usr/bin/env npx tsx
// Release gate: prove the production JS bundles contain no personal workout
// data. Runs `npx expo export` for both store platforms (a real production
// Metro build, which must strip the __DEV__-guarded require of
// src/data/workouts.json) and scans the output for strings that exist only
// in the personal dataset.
//
//   npm run verify:release-bundle
//
// Two-sided check so a passing run actually proves something:
//   1. a distinctive string from the always-bundled preview dataset MUST be
//      found (confirms we are scanning the right artifact and that bundled
//      JSON is greppable), and
//   2. no personal-only string may be found.
// On machines without data/workouts.csv (e.g. CI) step 2 has nothing to
// check and says so; the export + preview probe still run.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.join(__dirname, '..');
const personalCsv = path.join(root, 'data', 'workouts.csv');
const personalJson = path.join(root, 'src', 'data', 'workouts.json');
const previewJson = path.join(root, 'src', 'data', 'preview-workouts.json');

interface WorkoutLike {
  title?: string;
  description?: string;
  notes?: string;
  [k: string]: unknown;
}

// Candidate probe strings: plain-ASCII, escaping-proof (no quotes or
// backslashes, so they appear byte-identical whether Metro inlines the JSON
// as an object literal or a JSON.parse string), and long enough to never
// collide by accident.
function probeStrings(workouts: WorkoutLike[]): string[] {
  const out = new Set<string>();
  for (const w of workouts) {
    for (const field of [w.title, w.description, w.notes]) {
      if (typeof field !== 'string') continue;
      for (const line of field.split('\n')) {
        const s = line.trim();
        if (s.length >= 16 && /^[\x20-\x7E]+$/.test(s) && !/["\\]/.test(s)) out.add(s);
      }
    }
  }
  return [...out];
}

function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

function main() {
  const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wodview-export-'));

  console.log('Exporting production iOS + Android bundles (this takes a few minutes)…');
  execSync(
    `npx expo export --platform ios --platform android --output-dir ${JSON.stringify(exportDir)}`,
    {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );

  // Concatenate every exported file into one buffer to scan (bundles may be
  // plain JS or Hermes bytecode; ASCII string data is greppable in both).
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(exportDir);
  const blob = Buffer.concat(files.map((f) => fs.readFileSync(f)));
  console.log(`Scanning ${files.length} exported files (${(blob.length / 1e6).toFixed(1)} MB).`);

  // 1. Positive control: preview data must be present.
  const preview = JSON.parse(fs.readFileSync(previewJson, 'utf8')) as WorkoutLike[];
  const previewProbes = sampleEvenly(probeStrings(preview), 20);
  if (previewProbes.length === 0) throw new Error('no usable probe strings in preview dataset');
  const previewHit = previewProbes.some((s) => blob.includes(s));
  if (!previewHit) {
    console.error(
      '\nFAIL: no preview-dataset string found in the export. The scan cannot be\n' +
        'trusted (wrong artifact, or bundled JSON is no longer greppable) — fix\n' +
        'the check before trusting a release.',
    );
    process.exit(1);
  }
  console.log('✓ positive control: preview dataset found in bundle (scan is valid)');

  // 2. Personal data must be absent.
  if (!fs.existsSync(personalCsv) || !fs.existsSync(personalJson)) {
    console.log('· personal dataset not on this machine — nothing to leak-check (OK on CI)');
    return;
  }
  const previewText = fs.readFileSync(previewJson, 'utf8');
  const personal = JSON.parse(fs.readFileSync(personalJson, 'utf8')) as WorkoutLike[];
  const personalProbes = sampleEvenly(
    probeStrings(personal).filter((s) => !previewText.includes(s)),
    500,
  );
  const leaks = personalProbes.filter((s) => blob.includes(s));
  if (leaks.length > 0) {
    console.error(`\nFAIL: ${leaks.length} personal-only strings found in the production bundle:`);
    for (const s of leaks.slice(0, 5)) console.error(`  "${s.slice(0, 12)}…" (redacted)`);
    console.error('\nThe __DEV__ privacy boundary in src/lib/data-context.tsx is broken.');
    console.error('DO NOT SHIP THIS BUILD.');
    process.exit(1);
  }
  console.log(
    `✓ ${personalProbes.length} personal-only probe strings — none present in the bundle`,
  );
  console.log('\nRelease bundle is clean.');
}

main();
