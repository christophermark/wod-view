#!/usr/bin/env npx tsx
// Converts a SugarWOD CSV export into the JSON the app bundles.
//
//   input:  data/workouts.csv          (personal export, gitignored)
//   fallback: data/workouts.sample.csv (committed synthetic data, used when
//             no personal export exists — fresh clones and CI)
//   output: src/data/workouts.json     (gitignored)
//
// Runs on postinstall so a fresh `npm install` always produces a buildable app.

import fs from 'node:fs';
import path from 'node:path';

import { parseSugarwodCsv } from '../src/lib/parse-sugarwod';

const root = path.join(__dirname, '..');
const personal = path.join(root, 'data', 'workouts.csv');
const sample = path.join(root, 'data', 'workouts.sample.csv');
const output = path.join(root, 'src', 'data', 'workouts.json');

const input = fs.existsSync(personal) ? personal : sample;
const workouts = parseSugarwodCsv(fs.readFileSync(input, 'utf8'));

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(workouts, null, 2));
console.log(
  `Wrote ${workouts.length} workouts from ${path.basename(input)}` +
    `${input === sample ? ' (sample data — put your export at data/workouts.csv)' : ''}`,
);
