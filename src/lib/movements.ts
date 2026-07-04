// Movement taxonomy — the structured upgrade of the old flat MOVEMENTS regex
// list (docs/features/03-movement-taxonomy.md). Pure module: no React/React
// Native/Node imports, shared with the Node convert script and unit tests.
//
// Two consumer levels:
//   - Display movements (no `variantOf`) power movementCounts in computeStats;
//     the legacy 23 names keep their exact patterns so counts stay identical.
//   - Variants (`variantOf` set) add barbell-lift granularity for lift pages
//     without double-counting in the display list.

export type Modality = 'weightlifting' | 'gymnastics' | 'monostructural';

export interface MovementDef {
  /** Canonical display name, e.g. 'Wall Balls'. */
  name: string;
  /** Detection incl. aliases/abbreviations (T2B, HSPU, C2B, DU). */
  pattern: RegExp;
  /** CrossFit's M/G/W classification. */
  modality: Modality;
  equipment?: string;
  /** True for lifts that get progression pages (docs/features/06). */
  barbellLift?: boolean;
  /** Display-name of the broader movement this refines (e.g. 'Cleans'). */
  variantOf?: string;
}

export const MOVEMENT_DEFS: MovementDef[] = [
  // --- Legacy display movements. Patterns may only *widen* (extra spellings,
  // plurals, abbreviations) — the parity test asserts every workout the
  // original 23 regexes matched is still matched.
  { name: 'Burpees', pattern: /burpee/i, modality: 'gymnastics' },
  {
    name: 'Wall Balls',
    pattern: /wall[- ]?ball/i,
    modality: 'weightlifting',
    equipment: 'medball',
  },
  { name: 'Box Jumps', pattern: /box jump/i, modality: 'gymnastics', equipment: 'box' },
  {
    name: 'Deadlifts',
    pattern: /deadlift|\bdls?\b/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Double Unders',
    pattern: /double[- ]?unders?|\bdubs\b/i,
    modality: 'monostructural',
    equipment: 'rope',
  },
  { name: 'Pull-Ups', pattern: /pull-? ?up/i, modality: 'gymnastics', equipment: 'rig' },
  { name: 'Push-Ups', pattern: /push-? ?up/i, modality: 'gymnastics' },
  {
    name: 'Running',
    pattern: /\b\d+ ?m (run|row)|runs?\b|running\b/i,
    modality: 'monostructural',
  },
  {
    name: 'Rowing',
    pattern: /\brow(ing)?\b|calorie row/i,
    modality: 'monostructural',
    equipment: 'rower',
  },
  {
    name: 'KB Swings',
    pattern: /(kb|kettlebell).{0,20}swing|swing.{0,20}(kb|kettlebell)|(american|freedom) swings?/i,
    modality: 'weightlifting',
    equipment: 'kettlebell',
  },
  {
    name: 'Snatches',
    pattern: /snatch/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Cleans',
    pattern: /\bclean(?!\s*up\b)/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Thrusters',
    pattern: /thruster/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Front Squats',
    pattern: /front squat/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Back Squats',
    pattern: /back squat/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  { name: 'Lunges', pattern: /lunge/i, modality: 'gymnastics' },
  { name: 'Sit-Ups', pattern: /sit-? ?up/i, modality: 'gymnastics' },
  {
    name: 'Toes-to-Bar',
    pattern: /toes?.{0,3}(2|to).{0,3}bar|t2b|\bttb\b/i,
    modality: 'gymnastics',
    equipment: 'rig',
  },
  { name: 'HSPU', pattern: /hspu|handstand push/i, modality: 'gymnastics' },
  { name: 'Rope Climbs', pattern: /rope climb/i, modality: 'gymnastics', equipment: 'rope' },
  {
    name: 'Push Press',
    pattern: /push press/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Overhead Squats',
    pattern: /overhead squat|ohs/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  { name: 'Muscle-Ups', pattern: /muscle-? ?up/i, modality: 'gymnastics', equipment: 'rings' },

  // --- New display movements
  { name: 'Air Squats', pattern: /air squat/i, modality: 'gymnastics' },
  {
    name: 'Bench Press',
    pattern: /bench press/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Strict Press',
    pattern: /strict press|shoulder press/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Jerks',
    pattern: /\bjerks?\b/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Biking',
    pattern: /assault ?bike|echo ?bike|\bbike\b/i,
    modality: 'monostructural',
    equipment: 'bike',
  },
  { name: 'Ski Erg', pattern: /ski ?erg/i, modality: 'monostructural', equipment: 'ski' },
  { name: 'Pistols', pattern: /pistol/i, modality: 'gymnastics' },
  { name: 'Ring Dips', pattern: /ring dip/i, modality: 'gymnastics', equipment: 'rings' },
  { name: 'Dips', pattern: /\bdips?\b/i, modality: 'gymnastics' },
  { name: 'Ring Rows', pattern: /ring row/i, modality: 'gymnastics', equipment: 'rings' },
  { name: 'GHD Sit-Ups', pattern: /\bghd\b/i, modality: 'gymnastics', equipment: 'ghd' },
  { name: 'Wall Walks', pattern: /wall (walk|climb)/i, modality: 'gymnastics' },
  { name: 'Handstand Walk', pattern: /handstand walk|hs walk/i, modality: 'gymnastics' },
  {
    name: 'Devil Press',
    pattern: /devil'?s? press/i,
    modality: 'weightlifting',
    equipment: 'dumbbell',
  },
  {
    name: 'Chest-to-Bar',
    pattern: /chest.{0,3}(2|to).{0,3}bar|c2b/i,
    modality: 'gymnastics',
    equipment: 'rig',
  },
  {
    name: 'Knees-to-Elbows',
    pattern: /knees.{0,3}(2|to).{0,3}elbows?|k2e/i,
    modality: 'gymnastics',
    equipment: 'rig',
  },
  {
    name: 'Good Mornings',
    pattern: /good morning/i,
    modality: 'weightlifting',
    equipment: 'barbell',
  },
  {
    name: 'Hip Extensions',
    pattern: /hip extension|back extension/i,
    modality: 'gymnastics',
    equipment: 'ghd',
  },
  { name: 'V-Ups', pattern: /\bv-? ?ups?\b/i, modality: 'gymnastics' },
  { name: 'Planks', pattern: /plank/i, modality: 'gymnastics' },
  {
    name: 'Turkish Get-Ups',
    pattern: /turkish get|tgu/i,
    modality: 'weightlifting',
    equipment: 'kettlebell',
  },
  {
    name: 'Clusters',
    pattern: /\bclusters?\b/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  { name: 'Man Makers', pattern: /man ?maker/i, modality: 'weightlifting', equipment: 'dumbbell' },
  { name: 'Step-Ups', pattern: /step-? ?ups?\b/i, modality: 'gymnastics', equipment: 'box' },
  { name: 'Broad Jumps', pattern: /broad jump/i, modality: 'gymnastics' },
  { name: 'Mountain Climbers', pattern: /mountain climber/i, modality: 'gymnastics' },
  { name: 'Russian Twists', pattern: /(russian|plate) twists?/i, modality: 'gymnastics' },
  { name: 'Hollow Rocks', pattern: /hollow (rock|hold)/i, modality: 'gymnastics' },
  { name: 'Bear Crawls', pattern: /bear crawl/i, modality: 'gymnastics' },
  {
    name: 'Farmer Carries',
    pattern: /farmers? (carry|walk)/i,
    modality: 'weightlifting',
    equipment: 'dumbbell',
  },
  { name: 'Sled Work', pattern: /\bsled\b/i, modality: 'weightlifting', equipment: 'sled' },
  {
    name: 'SDHP',
    pattern: /sdhp|sumo (deadlift|dl) high pulls?|dlhps?/i,
    modality: 'weightlifting',
    equipment: 'barbell',
  },

  // --- Display movements added by the July 2026 coverage sweep against the
  // personal archive (docs/features/03-movement-taxonomy.md).
  {
    name: 'Goblet Squats',
    pattern: /goblet squats?/i,
    modality: 'weightlifting',
    equipment: 'kettlebell',
  },
  {
    name: 'Renegade Rows',
    pattern: /renegade rows?/i,
    modality: 'weightlifting',
    equipment: 'dumbbell',
  },
  {
    name: 'Dumbbell Rows',
    pattern: /(db|dumbbell|bent[- ]?over|barbell) rows?/i,
    modality: 'weightlifting',
    equipment: 'dumbbell',
  },
  {
    name: 'Ground-to-Overhead',
    pattern: /ground.{0,3}(2|to).{0,3}overhead|g2oh|\bgtoh\b/i,
    modality: 'weightlifting',
    equipment: 'plate',
  },
  {
    name: 'Shoulder-to-Overhead',
    pattern: /shoulder.{0,3}(2|to).{0,3}overhead|s2oh|\bstoh\b/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
  },
  {
    name: 'Box Step-Overs',
    pattern: /step[- ]?overs?\b/i,
    modality: 'gymnastics',
    equipment: 'box',
  },
  { name: 'Flutter Kicks', pattern: /flutter kicks?/i, modality: 'gymnastics' },
  { name: 'Arch Holds', pattern: /arch (hold|rock)/i, modality: 'gymnastics' },
  { name: 'Handstand Holds', pattern: /handstand (hold|time)/i, modality: 'gymnastics' },

  // --- Barbell-lift variants (granularity for lift pages; excluded from the
  // display list so "most programmed" doesn't count Cleans twice).
  {
    name: 'Power Cleans',
    pattern: /power clean/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Cleans',
  },
  {
    name: 'Squat Cleans',
    pattern: /squat clean/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Cleans',
  },
  {
    name: 'Hang Cleans',
    pattern: /hang (power |squat )?clean/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Cleans',
  },
  {
    name: 'Clean & Jerks',
    pattern: /clean\s*(&|and|\+)\s*jerk/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Cleans',
  },
  {
    name: 'Power Snatches',
    pattern: /power snatch/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Snatches',
  },
  {
    name: 'Squat Snatches',
    pattern: /squat snatch/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Snatches',
  },
  {
    name: 'Hang Snatches',
    pattern: /hang (power |squat )?snatch/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Snatches',
  },
  {
    name: 'Push Jerks',
    pattern: /push jerk/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Jerks',
  },
  {
    name: 'Split Jerks',
    pattern: /split jerk/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Jerks',
  },
  {
    name: 'Sumo Deadlifts',
    pattern: /sumo deadlift(?!\s+high)/i,
    modality: 'weightlifting',
    equipment: 'barbell',
    barbellLift: true,
    variantOf: 'Deadlifts',
  },
  {
    name: 'Bar Muscle-Ups',
    pattern: /bar muscle-? ?up/i,
    modality: 'gymnastics',
    equipment: 'rig',
    variantOf: 'Muscle-Ups',
  },
  {
    name: 'Ring Muscle-Ups',
    pattern: /ring muscle-? ?up/i,
    modality: 'gymnastics',
    equipment: 'rings',
    variantOf: 'Muscle-Ups',
  },
];

/** Display-level movements: what movementCounts and volume stats iterate. */
export const DISPLAY_MOVEMENTS: MovementDef[] = MOVEMENT_DEFS.filter((d) => !d.variantOf);

/**
 * The text to run movement detection against. Percentage-scheme strength days
 * ("6 Rounds @ 2:00 / 5 reps @ 45% of 3RM…") often name their lift only in
 * the workout title, so when the description contains no detectable movement
 * the title is appended as a fallback line. Descriptions that already name a
 * movement never consult the title — real titles carry coach names and
 * day-of-week chatter that must not add phantom detections.
 */
export function detectionText(w: { description: string; title: string }): string {
  if (MOVEMENT_DEFS.some((d) => d.pattern.test(w.description))) return w.description;
  return w.title ? `${w.description}\n${w.title}` : w.description;
}

// ---------------------------------------------------------------------------
// Detection with rep estimation

export interface DetectedMovement {
  def: MovementDef;
  /**
   * Estimated total reps across the workout, or null when any occurrence is
   * unparseable. Always an estimate — descriptions pass through
   * restoreLineBreaks() heuristics, so consumers must render these as "≈".
   */
  reps: number | null;
}

export interface DetectOptions {
  /**
   * Completed AMRAP rounds when the caller knows them (e.g. from a
   * "Rounds + Reps" score). Without it, AMRAP workouts detect movements but
   * report null reps — totals are unknowable from the description alone.
   */
  amrapRounds?: number | null;
}

/** "21-15-9" style ladders: three or more dash-joined rep counts. */
const LADDER = /(?<!\d)(\d{1,3}(?:\s*-\s*\d{1,3}){2,})(?!\d)/;
/**
 * "5 Rounds", "5 RFT", "x 7 sets" — a whole-workout multiplier. Guarded
 * against logging chatter like "note load lifted in last 3 sets".
 */
const ROUNDS =
  /(?<!last\s)(?<!final\s)(?<!first\s)\b(\d{1,2})\s*(?:rounds?|rnds?|rds|rft|sets?)\b/i;
/** "5x5", "3 x 10" — a complete sets×reps scheme (strength-day notation). */
const SETS_X_REPS = /(?<!\d)(\d{1,2})\s*[x×]\s*(\d{1,3})(?!\d)/i;
/** "12:00 EMOM", "EMOM 12", "EMOM x 12" — total minutes. */
const EMOM =
  /(?:(\d{1,2})(?::\d{2})?\s*(?:min(?:ute)?s?\s*)?emom)|(?:emom\s*(?:x\s*)?(\d{1,2})\b)/i;
/** "Minute 1:", "Min 2 -", "Odd:", "Even:" — one EMOM slot per line. */
const EMOM_SLOT = /^(?:min(?:ute)?s?\.?\s*\d|odd\b|even\b)/i;

/** Trailing count just before a movement mention: "12 Toes-to-Bar", "13 Cal Row". */
const TRAILING_COUNT = /(\d{1,4})\s*(?:x|×)?\s*(?:cal(?:orie)?s?\s+)?$/i;

/** Removes load/height notations ("95#", "115 lb", "53/35", "24\"") from a line. */
function stripLoads(line: string): string {
  return line.replace(/\d+\s*(?:#|lbs?\b|kg\b|['"″”])/g, '').replace(/\d+\s*\/\s*\d+/g, '');
}

/** A per-line rep count plus whether it is already a complete scheme total. */
interface LineCount {
  reps: number;
  /** Complete totals (ladder sums, sets×reps products) skip round multipliers. */
  complete: boolean;
}

function repsBeforeMatch(
  line: string,
  matchIndex: number,
  ladderSum: number | null,
): LineCount | null {
  const before = line.slice(0, matchIndex);
  // The "count" is the tail of a rep ladder ("21-15-9 Thrusters") — the
  // movement gets the whole ladder, not the last rung.
  if (ladderSum != null && /\d(?:\s*-\s*\d+){2,}\s*$/.test(before)) {
    return { reps: ladderSum, complete: true };
  }
  // "5x3 Power Cleans" — a sets×reps scheme right before the movement is the
  // whole prescription, not a count of 3.
  const scheme = before.match(/(?<!\d)(\d{1,2})\s*[x×]\s*(\d{1,3})\s*$/i);
  if (scheme) return { reps: Number(scheme[1]) * Number(scheme[2]), complete: true };
  const m = before.match(TRAILING_COUNT);
  if (!m) return null;
  return { reps: Number(m[1]), complete: false };
}

/**
 * Detects every taxonomy movement (display defs and variants) in a workout
 * description and estimates total reps per movement where the rep scheme is
 * parseable. Conservative by design: ambiguity yields null, never a guess.
 */
export function detectMovements(description: string, opts: DetectOptions = {}): DetectedMovement[] {
  const lines = description
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let roundsMult: number | null = null;
  let ladderSum: number | null = null;
  let emomMinutes: number | null = null;
  let amrap = false;
  for (const line of lines) {
    if (roundsMult == null) {
      const rounds = line.match(ROUNDS);
      if (rounds) roundsMult = Number(rounds[1]);
    }
    if (ladderSum == null) {
      const ladder = line.match(LADDER);
      if (ladder) {
        ladderSum = ladder[1]
          .split('-')
          .map((n) => Number(n.trim()))
          .reduce((a, b) => a + b, 0);
      }
    }
    if (emomMinutes == null) {
      const emom = line.match(EMOM);
      if (emom) emomMinutes = Number(emom[1] ?? emom[2]);
    }
    if (/\bamrap\b/i.test(line)) amrap = true;
  }

  // Each EMOM slot repeats minutes/slots times ("12:00 EMOM" over 4 minute-
  // slots → each line happens 3 times). Unknown slot count → null repeats.
  const slotCount = lines.filter((l) => EMOM_SLOT.test(l)).length;
  const emomRepeats =
    emomMinutes != null && slotCount >= 2 ? Math.floor(emomMinutes / slotCount) : null;

  const detected: DetectedMovement[] = [];
  for (const def of MOVEMENT_DEFS) {
    let found = false;
    let total: number | null = 0;
    for (const line of lines) {
      const match = def.pattern.exec(line);
      if (!match) continue;
      found = true;
      if (total == null) continue; // already unparseable
      let base = repsBeforeMatch(line, match.index, ladderSum);
      if (base == null) {
        // "Back Squat 5x5" — the scheme trails the movement; the product is
        // the complete prescription.
        const scheme = SETS_X_REPS.exec(line.slice(match.index));
        if (scheme) base = { reps: Number(scheme[1]) * Number(scheme[2]), complete: true };
      }
      // A count-less movement line under a ladder ("21-15-9 / Thrusters 95# /
      // Pull-Ups") gets the ladder sum. Loads and heights (95#, 53/35, 24")
      // aren't counts, so strip them first; any digits left (400m Run) mean
      // the line is doing something else and stays unparseable.
      if (base == null && ladderSum != null && !/\d/.test(stripLoads(line))) {
        base = { reps: ladderSum, complete: true };
      }
      if (base == null) {
        total = null;
        continue;
      }
      let lineReps: number | null;
      if (base.complete) {
        lineReps = base.reps; // ladders and sets×reps are already whole-workout totals
      } else if (amrap) {
        lineReps = opts.amrapRounds != null ? base.reps * opts.amrapRounds : null;
      } else if (emomMinutes != null && EMOM_SLOT.test(line)) {
        lineReps = emomRepeats != null ? base.reps * emomRepeats : null;
      } else if (emomMinutes != null && slotCount === 0) {
        // "EMOM 10: 5 Power Cleans" — repeats unknown without slot lines
        lineReps = null;
      } else {
        lineReps = base.reps * (roundsMult ?? 1);
      }
      total = lineReps == null ? null : total + lineReps;
    }
    if (found) detected.push({ def, reps: total });
  }
  return detected;
}
