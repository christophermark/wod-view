// Movement-detection coverage analysis. Runs the taxonomy against the local
// dataset (personal workouts.json when present, preview data otherwise) and
// prints aggregates: per-movement hits, rep-parse rates, line coverage, and
// frequency-mined unmatched lines — the hunting ground for missing movements.
//
// Usage: npx tsx scripts/analyze-movement-coverage.ts [--top N]
//
// Output is terminal-only aggregates and normalized phrases. Nothing here may
// be committed: the personal dataset is gitignored (see AGENTS.md privacy
// rule), and any new test cases must be synthetic recreations.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { detectionText, detectMovements, MOVEMENT_DEFS } from '../src/lib/movements';
import type { Workout } from '../src/lib/workouts';

const root = join(__dirname, '..');
const personal = join(root, 'src/data/workouts.json');
const preview = join(root, 'src/data/preview-workouts.json');
const source = existsSync(personal) ? personal : preview;
const workouts: Workout[] = JSON.parse(readFileSync(source, 'utf8'));

const topArg = process.argv.indexOf('--top');
const topN = topArg > -1 ? Number(process.argv[topArg + 1]) : 80;

// ---------------------------------------------------------------- per-def stats
const perDef = new Map<string, { hits: number; repsParsed: number }>();
for (const def of MOVEMENT_DEFS) perDef.set(def.name, { hits: 0, repsParsed: 0 });

let anyDetection = 0;
let totalDetections = 0;
let totalRepsParsed = 0;
for (const w of workouts) {
  const detected = detectMovements(detectionText(w));
  if (detected.length > 0) anyDetection++;
  for (const d of detected) {
    const s = perDef.get(d.def.name)!;
    s.hits++;
    totalDetections++;
    if (d.reps != null) {
      s.repsParsed++;
      totalRepsParsed++;
    }
  }
}

console.log('=== DATASET ===');
console.log(
  `source: ${source.includes('preview') ? 'preview (synthetic)' : 'personal (local only)'}`,
);
console.log(`workouts: ${workouts.length} · with ≥1 detected movement: ${anyDetection}`);
console.log(
  `detections: ${totalDetections} · with parsed ≈reps: ${totalRepsParsed} (${Math.round(
    (100 * totalRepsParsed) / Math.max(1, totalDetections),
  )}%)`,
);

console.log('\n=== PER-MOVEMENT (workouts hit / reps parsed) ===');
const rows = [...perDef.entries()].sort((a, b) => b[1].hits - a[1].hits);
for (const [name, s] of rows) {
  if (s.hits > 0) {
    console.log(`${String(s.hits).padStart(4)}  ${String(s.repsParsed).padStart(4)}  ${name}`);
  }
}
const zero = rows.filter(([, s]) => s.hits === 0).map(([name]) => name);
if (zero.length > 0) console.log(`\nnever detected (${zero.length}): ${zero.join(', ')}`);

// ------------------------------------------------------------- unmatched lines
// Lines where no def matches — candidates for missing movements or spellings.
const NOISE =
  /^(for time|time|amrap|emom|e\d?mom|rest|then|and then|buy.?in|cash.?out|score|cap|rx|scaled|min(ute)?s?\b|every|complete|max|part [ab\d]|warm.?up|metcon|strength|wod|workout|notes?|\d+([:.]\d+)?|\W*)[:.!\s]*$/i;

function normalize(line: string): string {
  return line
    .toLowerCase()
    .replace(/\d+\s*(#|lbs?\b|kg\b|['"″”]|%)/g, ' ')
    .replace(/\d+\s*\/\s*\d+/g, ' ')
    .replace(/\b\d+(\.\d+)?\s*(m|km|meters?|cal(orie)?s?|reps?|sec(onds?)?|min(utes?)?)\b/gi, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[^a-z&+'-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const unmatched = new Map<string, number>();
let contentLines = 0;
let matchedLines = 0;
for (const w of workouts) {
  for (const raw of w.description.split('\n')) {
    const line = raw.trim();
    if (!line || NOISE.test(line)) continue;
    contentLines++;
    if (MOVEMENT_DEFS.some((d) => d.pattern.test(line))) {
      matchedLines++;
      continue;
    }
    const norm = normalize(line);
    if (norm.length < 3) continue;
    unmatched.set(norm, (unmatched.get(norm) ?? 0) + 1);
  }
}

console.log('\n=== LINE COVERAGE ===');
console.log(
  `content lines: ${contentLines} · with a detected movement: ${matchedLines} (${Math.round(
    (100 * matchedLines) / Math.max(1, contentLines),
  )}%)`,
);

console.log(`\n=== UNMATCHED LINES (normalized, by frequency, top ${topN}) ===`);
const top = [...unmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
for (const [norm, count] of top) console.log(`${String(count).padStart(4)}  ${norm}`);
