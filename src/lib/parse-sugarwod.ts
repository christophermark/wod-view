// Parses a SugarWOD CSV export into Workout objects. Shared by the
// scripts/convert-workouts.ts build step and the in-app CSV importer,
// so it must stay free of React/React Native and Node imports.

import { Workout, parseDate } from './workouts';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Restores the line breaks SugarWOD strips from multi-line fields on export.
 * Heuristic by necessity: glued digit runs like "24/206 Deadlifts" (box height
 * then rep count) are ambiguous and left alone.
 */
export function restoreLineBreaks(text: string): string {
  if (!text) return '';
  let t = text;
  // Runs of 2+ spaces are line breaks the export flattened
  t = t.replace(/ {2,}/g, '\n');
  // ")After Round 3", "Pull-UpsDirectly", "CAP.Then" — word/closer glued to a capitalized word
  t = t.replace(/(?<!\bMc)(?<!Sugar)(?<=[a-z#%")\].!?…])(?=[A-Z][a-z])/g, '\n');
  // "…Pull-UpsRX+…", ")RX", "workRx+" — glued to an all-caps token like RX/HSPU/EMOM
  t = t.replace(/(?<=[a-z#%")\].!?…])(?=[A-Z]{2,}\b)/g, '\n');
  // "14#30 KB", "20\"30 Cal", ")21 Wall Balls" — unit/closer glued to a leading count
  t = t.replace(/(?<=[#%")\]”″"])(?=\d)/g, '\n');
  // "Bar400m", "reps21" — word (2+ lowercase letters) glued to a number
  t = t.replace(/(?<=[a-z]{2})(?=\d)/g, '\n');
  // "AMR40", "EMOM10" — all-caps token glued to a number (leaves T2B, C2B, E2MOM alone)
  t = t.replace(/(?<=[A-Z]{2})(?=\d)/g, '\n');
  // "TIME:30-20-10" — header colon glued to a number ("20:00" times stay intact)
  t = t.replace(/(?<=[A-Za-z]:)(?=\d)/g, '\n');
  // "10Back Squats" — count range glued to a capitalized movement
  t = t.replace(/(?<=\d)(?=[A-Z][a-z])/g, '\n');
  // "53#/35#*20:00 TIME CAP" — footnote asterisk glued to previous line
  t = t.replace(/(?<=\S)(?=\*)/g, '\n');
  return t
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function toIsoDate(mdy: string): string {
  const [m, d, y] = mdy.split('/');
  // Missing/extra parts fall through as "undefined" or empty segments, which
  // parseDate() below turns into NaN — callers check that to raise a clean
  // per-row error instead of us throwing here.
  return `${y}-${(m ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
}

const REQUIRED_COLUMNS = ['date', 'title', 'description', 'best_result_display'];

/**
 * Parses a full SugarWOD CSV export. Returns workouts sorted newest-first.
 * Throws if the header doesn't look like a SugarWOD export.
 */
export function parseSugarwodCsv(csv: string): Workout[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new Error('Empty CSV file');
  const col = Object.fromEntries(header.map((name, i) => [name.trim(), i]));
  const missing = REQUIRED_COLUMNS.filter((name) => !(name in col));
  if (missing.length > 0) {
    throw new Error(`Not a SugarWOD export — missing columns: ${missing.join(', ')}`);
  }

  return rows
    .map((row, i): Workout => {
      const get = (name: string) => (row[col[name]] ?? '').trim();
      let sets: Workout['sets'] = [];
      try {
        sets = JSON.parse(get('set_details') || '[]');
      } catch {
        sets = [];
      }
      const rawScore = parseFloat(get('best_result_raw'));
      const date = toIsoDate(get('date'));
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
        throw new Error(`Row ${i + 2}: unparseable date "${get('date')}"`);
      }
      return {
        id: `${date}-${i}`,
        date,
        title: get('title'),
        description: restoreLineBreaks(get('description')),
        score: get('best_result_display'),
        scoreRaw: Number.isFinite(rawScore) ? rawScore : null,
        scoreType: get('score_type'),
        barbellLift: get('barbell_lift'),
        sets,
        notes: restoreLineBreaks(get('notes')),
        rx: get('rx_or_scaled') === 'RX',
        pr: get('pr') === 'PR',
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
