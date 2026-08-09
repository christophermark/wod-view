#!/usr/bin/env npx tsx
// Converts CSV exports (SugarWOD or Chalk It Pro) into the JSON modules the
// app bundles.
//
//   src/data/workouts.json         — dev-only "test mode" dataset, from
//                                    data/workouts.csv (personal, gitignored)
//                                    or the sample CSV when none exists.
//                                    Only ever required behind __DEV__, so it
//                                    never ships in release bundles.
//   src/data/preview-workouts.json — App Store preview-mode dataset, always
//                                    from data/workouts.sample.csv (committed
//                                    synthetic data). Bundled in all builds.
//   src/data/dev-datasets.json     — every parseable data/*.csv, as
//                                    selectable dev-only data sources
//                                    (gitignored, may contain personal data).
//                                    Only ever required behind __DEV__.
//
// Runs on postinstall so a fresh `npm install` always produces a buildable app.

import fs from 'node:fs';
import path from 'node:path';

import { parseWorkoutsCsv } from '../src/lib/parse-workouts-csv';
import { Workout } from '../src/lib/workouts';

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const personal = path.join(dataDir, 'workouts.csv');
const sample = path.join(dataDir, 'workouts.sample.csv');
const outDir = path.join(root, 'src', 'data');

function convert(input: string, output: string): number {
  const workouts = parseWorkoutsCsv(fs.readFileSync(input, 'utf8'));
  fs.writeFileSync(output, JSON.stringify(workouts, null, 2));
  return workouts.length;
}

fs.mkdirSync(outDir, { recursive: true });

const devInput = fs.existsSync(personal) ? personal : sample;
const devCount = convert(devInput, path.join(outDir, 'workouts.json'));
console.log(
  `Wrote ${devCount} workouts from ${path.basename(devInput)}` +
    `${devInput === sample ? ' (sample data — put your export at data/workouts.csv)' : ''}`,
);

const previewCount = convert(sample, path.join(outDir, 'preview-workouts.json'));
console.log(`Wrote ${previewCount} preview workouts from ${path.basename(sample)}`);

interface DevDataset {
  id: string;
  label: string;
  file: string;
  count: number;
  workouts: Workout[];
}

const specialLabels: Record<string, string> = {
  workouts: 'MY HISTORY',
  'workouts.sample': 'SAMPLE DATA',
};

function labelFor(id: string): string {
  return specialLabels[id] ?? id.replace(/[-_.]/g, ' ').toUpperCase();
}

const csvFiles = fs.existsSync(dataDir)
  ? fs
      .readdirSync(dataDir)
      .filter((name) => name.endsWith('.csv'))
      .sort((a, b) => {
        if (a === 'workouts.csv') return -1;
        if (b === 'workouts.csv') return 1;
        return a.localeCompare(b);
      })
  : [];

const devDatasets: DevDataset[] = [];
for (const file of csvFiles) {
  const id = file.slice(0, -'.csv'.length);
  try {
    const workouts = parseWorkoutsCsv(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    devDatasets.push({ id, label: labelFor(id), file, count: workouts.length, workouts });
  } catch (e) {
    const reason = e instanceof Error ? e.message : e;
    console.warn(`warning: skipping data/${file} — ${reason}`);
  }
}

fs.writeFileSync(path.join(outDir, 'dev-datasets.json'), JSON.stringify(devDatasets, null, 2));
console.log(
  `Wrote ${devDatasets.length} dev dataset(s): ` +
    (devDatasets.length > 0
      ? devDatasets.map((d) => `${d.label} (${d.count})`).join(', ')
      : 'none'),
);
