#!/usr/bin/env npx tsx
// Generates data/workouts.sample.csv — a fully synthetic SugarWOD-style export.
//
// This dataset doubles as the App Store preview-mode data and the CI/sample
// fallback, so it needs to feel like a real training log: ~3 years of history,
// benchmark repeats with PRs, strength progressions, and realistic attendance
// gaps (holidays, a vacation, one long injury layoff).
//
// Everything here is invented. Per the repo privacy rule, no titles, scores,
// or notes may be copied from a personal export. Output is deterministic
// (seeded PRNG, fixed date range) so regeneration is diff-stable.

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)

let seed = 0x5eed;
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

// ---------------------------------------------------------------------------
// Attendance plan: sessions per month, July 2023 → July 1 2026.
// The shape tells a story — New Year surges, holiday dips, a July 2024 injury
// layoff with a slow comeback, and a three-week vacation in July 2025.

const MONTH_PLAN: [month: string, sessions: number][] = [
  ['2023-07', 10],
  ['2023-08', 13],
  ['2023-09', 12],
  ['2023-10', 14],
  ['2023-11', 9],
  ['2023-12', 6],
  ['2024-01', 16],
  ['2024-02', 13],
  ['2024-03', 12],
  ['2024-04', 11],
  ['2024-05', 12],
  ['2024-06', 3],
  ['2024-07', 0],
  ['2024-08', 2],
  ['2024-09', 8],
  ['2024-10', 11],
  ['2024-11', 10],
  ['2024-12', 5],
  ['2025-01', 14],
  ['2025-02', 12],
  ['2025-03', 13],
  ['2025-04', 10],
  ['2025-05', 12],
  ['2025-06', 9],
  ['2025-07', 4],
  ['2025-08', 10],
  ['2025-09', 12],
  ['2025-10', 13],
  ['2025-11', 8],
  ['2025-12', 7],
  ['2026-01', 15],
  ['2026-02', 12],
  ['2026-03', 14],
  ['2026-04', 11],
  ['2026-05', 13],
  ['2026-06', 10],
  ['2026-07', 1],
];

// Memorial Day Murph and the CrossFit Open anchor each year to real dates.
const MURPH_DATES = ['2024-05-27', '2025-05-26', '2026-05-25'];
const OPEN_WEEKS: [id: string, date: string][] = [
  ['24.1', '2024-03-01'],
  ['24.2', '2024-03-08'],
  ['24.3', '2024-03-15'],
  ['25.1', '2025-02-28'],
  ['25.2', '2025-03-07'],
  ['25.3', '2025-03-14'],
  ['26.1', '2026-02-27'],
  ['26.2', '2026-03-06'],
  ['26.3', '2026-03-13'],
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pickSessionDays(monthKey: string, count: number): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  // Vacation month: cram sessions into the first and last week.
  const vacation = monthKey === '2025-07';
  const candidates: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (monthKey === '2026-07' && d > 1) break; // log ends July 1 2026
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0) continue; // gym closed Sundays
    if (vacation && d > 7 && d < 28) continue;
    candidates.push(d);
  }
  if (candidates.length === 0) return [];
  // Weight weekdays over Saturdays, then sample without replacement.
  const weighted = candidates.flatMap((d) => {
    const dow = new Date(y, m - 1, d).getDay();
    return dow === 6 ? [d] : [d, d, d];
  });
  const chosen = new Set<number>();
  while (chosen.size < Math.min(count, candidates.length)) chosen.add(pick(weighted));
  return [...chosen]
    .sort((a, b) => a - b)
    .map((d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
}

// ---------------------------------------------------------------------------
// Movement pool for metcons. reps: null means the line carries its own count
// (runs and rows). Loads use the classic Rx men/women pairs.

interface Movement {
  line: (reps: number) => string;
  reps: [number, number] | null;
}

const MOVEMENTS: Movement[] = [
  { line: (r) => `${r} Wall Balls 20#/14#`, reps: [10, 25] },
  { line: (r) => `${r} Box Jumps 24"/20"`, reps: [10, 20] },
  { line: (r) => `${r} Burpees`, reps: [8, 15] },
  { line: (r) => `${r} Pull-Ups`, reps: [8, 15] },
  { line: (r) => `${r} Push-Ups`, reps: [10, 20] },
  { line: (r) => `${r} Sit-Ups`, reps: [15, 30] },
  { line: (r) => `${r} Air Squats`, reps: [15, 30] },
  { line: (r) => `${r} KB Swings 53#/35#`, reps: [12, 21] },
  { line: (r) => `${r} Deadlifts 185#/125#`, reps: [8, 15] },
  { line: (r) => `${r} Thrusters 95#/65#`, reps: [8, 15] },
  { line: (r) => `${r} Power Cleans 135#/95#`, reps: [6, 12] },
  { line: (r) => `${r} Hang Snatches 95#/65#`, reps: [6, 10] },
  { line: (r) => `${r} Double Unders`, reps: [30, 60] },
  { line: (r) => `${r} Cal Row`, reps: [12, 20] },
  { line: () => `400m Run`, reps: null },
  { line: () => `200m Run`, reps: null },
  { line: (r) => `${r} Walking Lunges`, reps: [16, 30] },
  { line: (r) => `${r} Toes-to-Bar`, reps: [8, 15] },
  { line: (r) => `${r} HSPU`, reps: [5, 12] },
  { line: (r) => `${r} Front Squats 115#/85#`, reps: [8, 12] },
  { line: (r) => `${r} Push Press 75#/55#`, reps: [10, 15] },
  { line: (r) => `${r} Overhead Squats 95#/65#`, reps: [6, 12] },
  { line: (r) => `${r} Box Step-Ups 24"/20"`, reps: [12, 20] },
  { line: (r) => `${r} Rope Climbs`, reps: [2, 4] },
];

function pickMovements(n: number): string[] {
  const chosen = new Set<Movement>();
  while (chosen.size < n) chosen.add(pick(MOVEMENTS));
  return [...chosen].map((m) => m.line(m.reps ? randInt(m.reps[0], m.reps[1]) : 0));
}

const COACHES = ['Dana', 'Marcus', 'Priya', 'Theo', 'Val', 'Jo'];

const RX_NOTES = [
  'Unbroken on the first two rounds, then it fell apart',
  'Paced the row, sprinted the finish',
  'Grip was the limiter today',
  'Felt strong — breathing stayed under control',
  'Went out too hot, paid for it on round 3',
  'Legs were toast from yesterday',
  'Best engine day in a while 🔥',
  'Transitions killed me, need to move faster between stations',
  'Kept all sets of 5 touch and go',
  'Shoulder felt good again finally',
  'Quick singles on the bar work paid off',
  'Should have gone heavier',
  'That one hurt. In a good way.',
  'Slow and steady, just wanted to move today',
  'First workout back — rough but happy to be in the gym',
  'Cardio is coming back 💪',
  'Coach fixed my pull timing, huge difference',
];

const SCALED_NOTES = [
  'Scaled to 65# — form over ego',
  'Banded pull-ups, still building back strength',
  'Subbed step-ups for box jumps, knee acting up',
  'Half the double unders as singles',
  'Went lighter to keep moving the whole time',
  'Scaled the HSPU to pike push-ups',
  'Knees-to-chest instead of T2B today',
];

const note = (rx: boolean) =>
  chance(0.72) ? pick(rx ? RX_NOTES : chance(0.6) ? SCALED_NOTES : RX_NOTES) : '';

// ---------------------------------------------------------------------------
// Row assembly

interface Row {
  date: string; // ISO, converted to M/D/YYYY on write
  title: string;
  description: string;
  raw: number | '';
  display: string;
  scoreType: string;
  lift: string;
  sets: Record<string, number | string | boolean>[];
  notes: string;
  rx: boolean;
  pr: boolean;
}

const rows: Row[] = [];
const timeSets = (secs: number) => [{ mins: Math.floor(secs / 60), secs: secs % 60 }];
const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
// SugarWOD's export strips the newlines out of multi-line fields; emulate that
// so the sample exercises restoreLineBreaks() the same way real exports do.
const flatten = (lines: string[]) => lines.join('');

function weekdayTitle(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const day = DAY_NAMES[new Date(y, m - 1, d).getDay()];
  return chance(0.15)
    ? `${day} ${m}.${d}.${y} Coach ${pick(COACHES)}/${pick(COACHES)}`
    : `${day} - ${m}.${d}.${y}`;
}

function metconForTime(date: string): Row {
  const rx = chance(0.68);
  const style = rand();
  let lines: string[];
  let secs: number;
  if (style < 0.35) {
    const rounds = randInt(3, 5);
    lines = [`FOR TIME:`, `${rounds} Rounds:`, ...pickMovements(3)];
    if (chance(0.5)) lines.push(`*${randInt(10, 20)}:00 TIME CAP`);
    secs = randInt(420, 1080);
  } else if (style < 0.6) {
    lines = [`FOR TIME:`, `21-15-9`, ...pickMovements(2)];
    secs = randInt(300, 720);
  } else {
    const counts = [50, 40, 30, 20, 10];
    lines = [`FOR TIME:`, ...pickMovements(5).map((l, i) => l.replace(/^\d+ /, `${counts[i]} `))];
    secs = randInt(600, 1500);
  }
  return {
    date,
    title: weekdayTitle(date),
    description: flatten(lines),
    raw: secs,
    display: fmtTime(secs),
    scoreType: '',
    lift: '',
    sets: timeSets(secs),
    notes: note(rx),
    rx,
    pr: false,
  };
}

function amrap(date: string): Row {
  const rx = chance(0.68);
  const mins = pick([10, 12, 15, 20]);
  const lines = [`${mins}:00 AMRAP`, ...pickMovements(3)];
  const roundsDone = randInt(3, 8);
  // Mostly logged as total reps, occasionally as rounds+reps.
  if (chance(0.75)) {
    const reps = roundsDone * randInt(30, 55);
    return {
      date,
      title: weekdayTitle(date),
      description: flatten(lines),
      raw: reps,
      display: `${reps}`,
      scoreType: 'Reps',
      lift: '',
      sets: [{ reps }],
      notes: note(rx),
      rx,
      pr: false,
    };
  }
  const extra = randInt(0, 25);
  return {
    date,
    title: weekdayTitle(date),
    description: flatten(lines),
    raw: roundsDone,
    display: extra > 0 ? `${roundsDone}+${extra}` : `${roundsDone}`,
    scoreType: 'Rounds + Reps',
    lift: '',
    sets: [{ rnds: roundsDone, reps: extra }],
    notes: note(rx),
    rx,
    pr: false,
  };
}

function emom(date: string): Row {
  const rx = chance(0.72);
  const mins = pick([12, 16, 20]);
  const stations = pickMovements(3);
  const lines = [
    `${mins}:00 EMOM`,
    ...stations.map((s, i) => `Minute ${i + 1}: ${s}`),
    `Minute 4: Rest`,
  ];
  if (chance(0.5)) {
    return {
      date,
      title: weekdayTitle(date),
      description: flatten(lines),
      raw: 1,
      display: 'Yes',
      scoreType: 'Checkbox',
      lift: '',
      sets: [{ boolean: 1 }],
      notes: note(rx),
      rx,
      pr: false,
    };
  }
  const reps = randInt(120, 260);
  return {
    date,
    title: weekdayTitle(date),
    description: flatten(lines),
    raw: reps,
    display: `${reps}`,
    scoreType: 'Reps',
    lift: '',
    sets: [{ reps }],
    notes: note(rx),
    rx,
    pr: false,
  };
}

// Strength: each lift trends upward across the three years; heavy days that
// beat the previous best get the PR flag.
const LIFTS: {
  name: string;
  plural: string;
  start: number;
  gain: number;
  weight: number;
  best?: number;
}[] = [
  { name: 'Back Squat', plural: 'Back Squats', start: 205, gain: 70, weight: 3 },
  { name: 'Deadlift', plural: 'Deadlifts', start: 255, gain: 90, weight: 3 },
  { name: 'Bench Press', plural: 'Bench Press', start: 155, gain: 50, weight: 2 },
  { name: 'Front Squat', plural: 'Front Squats', start: 165, gain: 60, weight: 1 },
  { name: 'Push Press', plural: 'Push Presses', start: 125, gain: 40, weight: 1 },
  { name: 'Power Clean', plural: 'Power Cleans', start: 145, gain: 50, weight: 1 },
  { name: 'Snatch', plural: 'Snatches', start: 95, gain: 40, weight: 1 },
  { name: 'Overhead Squat', plural: 'Overhead Squats', start: 115, gain: 40, weight: 1 },
];
const WEIGHTED_LIFTS = LIFTS.flatMap((l) => Array.from({ length: l.weight }, () => l));
const START_MS = new Date(2023, 6, 1).getTime();
const END_MS = new Date(2026, 6, 1).getTime();

function strength(date: string): Row {
  const lift = pick(WEIGHTED_LIFTS);
  const [y, m, d] = date.split('-').map(Number);
  const progress = (new Date(y, m - 1, d).getTime() - START_MS) / (END_MS - START_MS);
  const current = lift.start + lift.gain * progress;
  const heavyDay = chance(0.55);
  if (heavyDay) {
    const scheme = pick(['a heavy single', 'a heavy triple', 'a 1RM']);
    const load = Math.round((current + randInt(-10, 12)) / 5) * 5;
    const pr = lift.best !== undefined && load > lift.best;
    lift.best = Math.max(lift.best ?? 0, load);
    return {
      date,
      title: `STRENGTH - ${lift.plural}`,
      description: flatten([`In a 20 minute window`, `Build to ${scheme} ${lift.name}.`]),
      raw: load,
      display: `${load}`,
      scoreType: 'Load',
      lift: lift.name,
      sets: [{ load, success: true }],
      notes: pr
        ? pick(['New PR! 🎉', `${load}# — five pound PR`, 'PR and it moved fast'])
        : note(true),
      rx: true,
      pr,
    };
  }
  const setCount = pick([3, 5]);
  const repCount = pick([3, 5]);
  const work = Math.round((current * 0.82) / 5) * 5;
  return {
    date,
    title: `${lift.name} ${setCount}x${repCount}`,
    description: flatten([
      `${setCount} sets of ${repCount} reps.`,
      `Across, building from last week.`,
    ]),
    raw: work,
    display: `${work}`,
    scoreType: 'Load',
    lift: lift.name,
    sets: Array.from({ length: Math.min(setCount, 3) }, (_, i) => ({
      load: work - (setCount - 1 - i) * 5,
      success: true,
    })),
    notes: note(true),
    rx: true,
    pr: false,
  };
}

// Benchmarks: repeats improve over time and flag a PR when they beat the
// previous best.
const BENCHMARKS: {
  name: string;
  lines: string[];
  range: [number, number];
  best?: number;
}[] = [
  {
    name: 'FRAN',
    lines: ['FOR TIME:', '21-15-9', 'Thrusters 95#/65#', 'Pull-Ups'],
    range: [300, 540],
  },
  {
    name: 'HELEN',
    lines: ['FOR TIME:', '3 Rounds:', '400m Run', '21 KB Swings 53#/35#', '12 Pull-Ups'],
    range: [600, 840],
  },
  { name: 'GRACE', lines: ['FOR TIME:', '30 Clean and Jerks 135#/95#'], range: [240, 480] },
  {
    name: 'ANNIE',
    lines: ['FOR TIME:', '50-40-30-20-10', 'Double Unders', 'Sit-Ups'],
    range: [480, 780],
  },
  {
    name: 'JACKIE',
    lines: ['FOR TIME:', '1000m Row', '50 Thrusters 45#/35#', '30 Pull-Ups'],
    range: [540, 840],
  },
  { name: 'KAREN', lines: ['FOR TIME:', '150 Wall Balls 20#/14#'], range: [480, 780] },
  {
    name: 'DT',
    lines: [
      '5 Rounds For Time:',
      '12 Deadlifts 155#/105#',
      '9 Hang Power Cleans 155#/105#',
      '6 Push Jerks 155#/105#',
    ],
    range: [540, 900],
  },
];

function benchmark(date: string): Row {
  const b = pick(BENCHMARKS);
  const rx = chance(0.75);
  let secs = randInt(b.range[0], b.range[1]);
  let pr = false;
  if (rx) {
    if (b.best !== undefined && chance(0.6)) {
      secs = Math.max(b.range[0], b.best - randInt(5, 45)); // repeats trend faster
      pr = true;
    }
    b.best = Math.min(b.best ?? Infinity, secs);
  }
  return {
    date,
    title: `"${b.name}"`,
    description: flatten(b.lines),
    raw: secs,
    display: fmtTime(secs),
    scoreType: '',
    lift: '',
    sets: timeSets(secs),
    notes: pr ? pick([`Beat my old time!`, `PR by a lot — pacing finally clicked`]) : note(rx),
    rx,
    pr,
  };
}

function murph(date: string, yearIndex: number): Row {
  const secs = [3480, 3240, 3030][yearIndex] + randInt(-60, 60);
  return {
    date,
    title: '"MURPH"',
    description: flatten([
      'FOR TIME:',
      '1 Mile Run',
      '100 Pull-Ups',
      '200 Push-Ups',
      '300 Air Squats',
      '1 Mile Run',
      '*Partition the pull-ups, push-ups, and squats as needed.',
    ]),
    raw: secs,
    display: fmtTime(secs),
    scoreType: '',
    lift: '',
    sets: timeSets(secs),
    notes: pick(['Memorial Day Murph 🇺🇸', 'Murph with the whole gym. Brutal and great.']),
    rx: yearIndex > 0,
    pr: yearIndex === 2,
  };
}

function openWorkout(date: string, id: string): Row {
  const rx = chance(0.7);
  const mins = pick([12, 15]);
  const lines = [`${mins}:00 AMRAP`, ...pickMovements(3), `*CrossFit Open ${id}`];
  const reps = randInt(140, 320);
  return {
    date,
    title: `Open ${id}`,
    description: flatten(lines),
    raw: reps,
    display: `${reps}`,
    scoreType: 'Reps',
    lift: '',
    sets: [{ reps }],
    notes: pick([
      'Friday Night Lights!',
      'Judged by a coach — every rep counted',
      'Redid it Sunday, kept the first score',
    ]),
    rx,
    pr: false,
  };
}

function skillOrOddity(date: string): Row {
  const kind = rand();
  if (kind < 0.3) {
    const skill = pick(['Handstands', 'Double Unders', 'Muscle-Ups', 'Pistols']);
    const index = randInt(2, 5);
    return {
      date,
      title: `SKILL - ${skill}`,
      description: flatten([`Spend 12:00 practicing ${skill.toLowerCase()}.`, `Rate how it felt.`]),
      raw: index,
      display: `${index}`,
      scoreType: 'Emoji Selection',
      lift: '',
      sets: [{ index }],
      notes: chance(0.4) ? pick(RX_NOTES) : '',
      rx: true,
      pr: false,
    };
  }
  if (kind < 0.5) {
    const inches = randInt(24, 34);
    return {
      date,
      title: 'Box Jump: Max Height',
      description: flatten(['Work to a max height box jump.', '15:00 window.']),
      raw: inches,
      display: `${inches}`,
      scoreType: 'Inches',
      lift: '',
      sets: [{ inches }],
      notes: chance(0.5) ? 'Plates stacked on the big box' : '',
      rx: true,
      pr: chance(0.4),
    };
  }
  if (kind < 0.65) {
    const cals = randInt(26, 40);
    return {
      date,
      title: '2:00 Max Cal Row',
      description: flatten(['2:00 all-out effort on the rower.', 'One attempt.']),
      raw: cals,
      display: `${cals}`,
      scoreType: 'Calories',
      lift: '',
      sets: [{ calories: cals }],
      notes: chance(0.5) ? 'Saw stars after this one' : '',
      rx: true,
      pr: false,
    };
  }
  if (kind < 0.85) {
    return {
      date,
      title: pick(['CORE', 'Post-WOD Core']),
      description: flatten(['3 Rounds:', '15 Hollow Rocks', '20 Flutter Kicks', '30s Plank']),
      raw: 1,
      display: 'Yes',
      scoreType: 'Checkbox',
      lift: '',
      sets: [{ boolean: 1 }],
      notes: '',
      rx: true,
      pr: false,
    };
  }
  const text = pick([
    'Completed with 75#',
    'Worked to a smooth set of 3',
    'Made it through 4 rounds',
  ]);
  return {
    date,
    title: weekdayTitle(date),
    description: flatten([
      'Partner WOD:',
      '80 Cal Row',
      '60 Wall Balls 20#/14#',
      '40 Burpees',
      'Split as needed.',
    ]),
    raw: '',
    display: text,
    scoreType: 'Other / Text',
    lift: '',
    sets: [{ other: text }],
    notes: note(true),
    rx: true,
    pr: false,
  };
}

// ---------------------------------------------------------------------------
// Build the log

for (const [monthKey, sessions] of MONTH_PLAN) {
  for (const date of pickSessionDays(monthKey, sessions)) {
    const murphIndex = MURPH_DATES.indexOf(date);
    if (murphIndex >= 0) {
      rows.push(murph(date, murphIndex));
      continue;
    }
    const open = OPEN_WEEKS.find(([, d]) => d === date);
    if (open) {
      rows.push(openWorkout(date, open[0]));
      continue;
    }
    const r = rand();
    if (r < 0.38) rows.push(metconForTime(date));
    else if (r < 0.62) rows.push(amrap(date));
    else if (r < 0.7) rows.push(emom(date));
    else if (r < 0.85) rows.push(strength(date));
    else if (r < 0.9) rows.push(benchmark(date));
    else rows.push(skillOrOddity(date));
  }
}
// Guarantee the anchor events land even if the day sampler skipped them.
for (const [i, date] of MURPH_DATES.entries()) {
  if (!rows.some((r) => r.date === date)) rows.push(murph(date, i));
}
for (const [id, date] of OPEN_WEEKS) {
  if (!rows.some((r) => r.date === date)) rows.push(openWorkout(date, id));
}
rows.sort((a, b) => (a.date < b.date ? -1 : 1));

// ---------------------------------------------------------------------------
// Write CSV

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toMdy = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};

const header =
  'date,title,description,best_result_raw,best_result_display,score_type,barbell_lift,set_details,notes,rx_or_scaled,pr';
const lines = rows.map((r) =>
  [
    toMdy(r.date),
    esc(r.title),
    esc(r.description),
    `${r.raw}`,
    esc(r.display),
    esc(r.scoreType),
    esc(r.lift),
    esc(JSON.stringify(r.sets)),
    esc(r.notes),
    r.rx ? 'RX' : 'SCALED',
    r.pr ? 'PR' : '',
  ].join(','),
);

const out = path.join(__dirname, '..', 'data', 'workouts.sample.csv');
fs.writeFileSync(out, [header, ...lines].join('\n') + '\n');
console.log(`Wrote ${rows.length} synthetic workouts to ${path.relative(process.cwd(), out)}`);
