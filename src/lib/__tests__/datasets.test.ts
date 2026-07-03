// Regression tests that run the real parser over the actual CSV datasets:
// the committed synthetic sample (always) and the personal export (only when
// it exists locally — it is gitignored, so CI skips it). Assertions stay
// structural on the personal file; its contents must never appear in code.

import fs from 'node:fs';
import path from 'node:path';

import { parseSugarwodCsv } from '../parse-sugarwod';
import { Workout, computeStats } from '../workouts';

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
const sampleCsv = path.join(dataDir, 'workouts.sample.csv');
const personalCsv = path.join(dataDir, 'workouts.csv');

function expectWellFormed(workouts: Workout[]) {
  expect(workouts.length).toBeGreaterThan(0);

  // Newest-first, ISO dates, unique ids.
  const ids = new Set(workouts.map((w) => w.id));
  expect(ids.size).toBe(workouts.length);
  for (const w of workouts) {
    expect(w.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(w.title).not.toBe('');
  }
  for (let i = 1; i < workouts.length; i++) {
    expect(workouts[i - 1].date >= workouts[i].date).toBe(true);
  }

  // Restored descriptions should not still contain flattened glue like
  // "Pull-Ups12" or ")After" — spot-check the patterns restoreLineBreaks fixes.
  for (const w of workouts) {
    expect(w.description).not.toMatch(/[a-z]{2}\d/);
    expect(w.description).not.toMatch(/ {2,}/);
  }

  // Stats over the full dataset must compute without throwing.
  const stats = computeStats(workouts);
  expect(stats.total).toBe(workouts.length);
  expect(stats.firstDate <= stats.lastDate).toBe(true);
}

describe('sample dataset (data/workouts.sample.csv)', () => {
  const workouts = parseSugarwodCsv(fs.readFileSync(sampleCsv, 'utf8'));

  it('parses into a well-formed workout list', () => {
    expectWellFormed(workouts);
  });

  it('is rich enough for App Store preview mode', () => {
    const stats = computeStats(workouts);
    expect(stats.total).toBeGreaterThan(250);
    const years = new Set(workouts.map((w) => w.date.slice(0, 4)));
    expect(years.size).toBeGreaterThanOrEqual(3);
    expect(stats.prCount).toBeGreaterThan(5);
    expect(stats.liftBests.length).toBeGreaterThan(3);
    // Attendance gaps are part of the design — at least one empty month.
    const months = new Set(workouts.map((w) => w.date.slice(0, 7)));
    expect(months.size).toBeLessThan(37);
  });
});

// Personal export is gitignored; this suite only runs on machines that have it.
(fs.existsSync(personalCsv) ? describe : describe.skip)(
  'personal dataset (data/workouts.csv, local only)',
  () => {
    it('parses into a well-formed workout list', () => {
      expectWellFormed(parseSugarwodCsv(fs.readFileSync(personalCsv, 'utf8')));
    });
  },
);
