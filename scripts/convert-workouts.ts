#!/usr/bin/env npx tsx
// Converts SugarWOD CSV exports into the JSON modules the app bundles.
//
//   src/data/workouts.json         — dev-only "test mode" dataset, from
//                                    data/workouts.csv (personal, gitignored)
//                                    or the sample CSV when none exists.
//                                    Only ever required behind __DEV__, so it
//                                    never ships in release bundles.
//   src/data/preview-workouts.json — App Store preview-mode dataset, always
//                                    from data/workouts.sample.csv (committed
//                                    synthetic data). Bundled in all builds.
//
// Runs on postinstall so a fresh `npm install` always produces a buildable app.

import fs from 'node:fs';
import path from 'node:path';

import { parseSugarwodCsv } from '../src/lib/parse-sugarwod';

const root = path.join(__dirname, '..');
const personal = path.join(root, 'data', 'workouts.csv');
const sample = path.join(root, 'data', 'workouts.sample.csv');
const dataDir = path.join(root, 'src', 'data');

function convert(input: string, output: string): number {
  const workouts = parseSugarwodCsv(fs.readFileSync(input, 'utf8'));
  fs.writeFileSync(output, JSON.stringify(workouts, null, 2));
  return workouts.length;
}

fs.mkdirSync(dataDir, { recursive: true });

const devInput = fs.existsSync(personal) ? personal : sample;
const devCount = convert(devInput, path.join(dataDir, 'workouts.json'));
console.log(
  `Wrote ${devCount} workouts from ${path.basename(devInput)}` +
    `${devInput === sample ? ' (sample data — put your export at data/workouts.csv)' : ''}`,
);

const previewCount = convert(sample, path.join(dataDir, 'preview-workouts.json'));
console.log(`Wrote ${previewCount} preview workouts from ${path.basename(sample)}`);
