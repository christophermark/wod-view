#!/usr/bin/env node
/**
 * Converts a SugarWOD CSV export (data/workouts.csv) into src/data/workouts.json.
 *
 * SugarWOD strips newlines out of the description and notes fields on export,
 * so movements run together ("30 Wall Balls 20#/14#30 KB Swings"). We restore
 * line breaks heuristically before writing the JSON.
 *
 * Usage: node scripts/convert-workouts.js
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'data', 'workouts.csv');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'workouts.json');

function parseCsv(text) {
  const rows = [];
  let row = [];
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

// Restore the line breaks SugarWOD strips from multi-line fields.
function restoreLineBreaks(text) {
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

function toIsoDate(mdy) {
  const [m, d, y] = mdy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const csv = fs.readFileSync(INPUT, 'utf8');
const [header, ...rows] = parseCsv(csv);
const col = Object.fromEntries(header.map((name, i) => [name, i]));

const workouts = rows
  .map((row, i) => {
    const get = (name) => (row[col[name]] ?? '').trim();
    let sets = [];
    try {
      sets = JSON.parse(get('set_details') || '[]');
    } catch {
      sets = [];
    }
    const rawScore = parseFloat(get('best_result_raw'));
    return {
      id: `${toIsoDate(get('date'))}-${i}`,
      date: toIsoDate(get('date')),
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

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(workouts, null, 2));
console.log(`Wrote ${workouts.length} workouts to ${path.relative(process.cwd(), OUTPUT)}`);
