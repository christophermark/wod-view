// Parses a Chalk It Pro CSV export (results.csv) into Workout objects.
// Like parse-sugarwod.ts, this must stay free of React/React Native and
// Node imports so it stays pure and unit-testable.
//
// The Chalk It Pro export is much thinner than SugarWOD's:
//
//   Title,Date,Style,RepMax,PrimaryMovement,BestScore,Notes
//
// - No description/programming text, no set details, no RX/scaled flag,
//   no PR flag, no raw score.
// - Dates are M/D/YYYY without zero padding.
// - Style is one of Reps, Load, Time, Rounds, Calories, Freeform. Rows that
//   round-tripped through a SugarWOD import mostly collapse to Freeform, so
//   a Freeform time score still looks like "14:46" and must be inferred.
// - Chalk's exporter strips commas from every text field and replaces each
//   non-ASCII UTF-16 code unit with "?" (emoji arrive as "??"), and newlines
//   are flattened away just like SugarWOD's export.

import { Workout, parseDate } from './workouts';
import { WrongFileError, parseCsv, restoreLineBreaks } from './parse-sugarwod';

const REQUIRED_COLUMNS = ['Title', 'Date', 'Style', 'BestScore'];

/**
 * Chalk's Style → the scoreType vocabulary the rest of the app already
 * understands (SugarWOD's score_type values). Time maps to '' because that
 * is how SugarWOD marks time scores and how the LOG tab's time filter and
 * scoreLabel() detect them (mm:ss score with empty type). Freeform is
 * Chalk's "untyped" bucket and also maps to '' for the same inference.
 */
const STYLE_TO_SCORE_TYPE: Record<string, string> = {
  Reps: 'Reps',
  Load: 'Load',
  Rounds: 'Rounds + Reps',
  Calories: 'Calories',
  Time: '',
  Freeform: '',
};

/**
 * Best-effort numeric score for sorting/benchmark comparison, mirroring
 * SugarWOD's best_result_raw conventions: times become total seconds and
 * "rounds+reps" scores become rounds + reps/10000. Text scores ("Yes",
 * mangled emoji) have no numeric form.
 */
export function chalkScoreRaw(score: string): number | null {
  const time = score.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (time) {
    const [, a, b, c] = time;
    return c ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
  }
  const roundsReps = score.match(/^(\d+)\+(\d+)$/);
  if (roundsReps) return Number(roundsReps[1]) + Number(roundsReps[2]) / 10000;
  const n = parseFloat(score);
  return Number.isFinite(n) && /^-?\d/.test(score) ? n : null;
}

function toIsoDate(mdy: string): string {
  const [m, d, y] = mdy.split('/');
  return `${y}-${(m ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
}

/**
 * Parses a full Chalk It Pro CSV export. Returns workouts sorted newest-first.
 * Throws WrongFileError if the header doesn't look like a Chalk It Pro export.
 */
export function parseChalkItProCsv(csv: string): Workout[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new WrongFileError('Empty CSV file');
  const col = Object.fromEntries(header.map((name, i) => [name.trim(), i]));
  const missing = REQUIRED_COLUMNS.filter((name) => !(name in col));
  if (missing.length > 0) {
    throw new WrongFileError(`Not a Chalk It Pro export — missing columns: ${missing.join(', ')}`);
  }

  return rows
    .map((row, i): Workout => {
      const get = (name: string) => (row[col[name]] ?? '').trim();
      const date = toIsoDate(get('Date'));
      const { year, month, day } = parseDate(date);
      const validDate =
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day) &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31;
      if (!validDate) {
        throw new Error(`Row ${i + 2}: unparseable date "${get('Date')}"`);
      }
      const score = get('BestScore');
      return {
        id: `${date}-${i}`,
        date,
        title: get('Title'),
        description: '', // Chalk exports carry no programming text
        score,
        scoreRaw: chalkScoreRaw(score),
        scoreType: STYLE_TO_SCORE_TYPE[get('Style')] ?? '',
        // PrimaryMovement is only set on rep-max lift entries; values are
        // Chalk's own spellings ("Back Squats") and are kept verbatim.
        barbellLift: get('PrimaryMovement'),
        sets: [],
        notes: restoreLineBreaks(get('Notes')),
        // Chalk exports carry no RX/scaled or PR information.
        rx: false,
        pr: false,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
