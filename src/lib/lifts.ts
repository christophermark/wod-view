// Lift progression, e1RM, percent-of-max (docs/features/06-lift-progression.md).
// Pure module: no React/React Native/Node imports, shared with unit tests.
//
// Attribution covers both worlds the brief measured: the handful of workouts
// carrying a `barbell_lift` tag, and the larger set of `Load` workouts whose
// lift is named only in the description/title. Rep schemes come from the
// description ("5x5", "3-3-3-1-1-1", "heavy single") — when unparseable the
// session still charts by top load, only the e1RM estimate is skipped.

import type { Workout } from './workouts';
import { todayIso as localTodayIso } from './benchmarks';
import { MOVEMENT_DEFS, detectionText } from './movements';

export interface LiftSet {
  load: number;
  success: boolean;
  /**
   * Reps for this specific set when the scheme spells them out (uniform
   * schemes apply to every set; ladders pair entry-by-entry). Null when the
   * scheme is unknown or can't be attributed per set.
   */
  reps: number | null;
}

export interface LiftSession {
  workoutId: string;
  date: string;
  /** Best successful load; falls back to the best load when every set failed. */
  topLoad: number;
  sets: LiftSet[];
  /** Per-set reps parsed from the description, or null when unparseable. */
  reps: number | null;
  /** Epley estimate off the best successful set; null when reps are unknown or >10. */
  e1rm: number | null;
}

export interface LiftPage {
  lift: string;
  /** Oldest first. */
  sessions: LiftSession[];
  /** Best successful load ever. 0 when every recorded set was a miss. */
  allTimeMax: number;
  /** Date the all-time max was first lifted. */
  allTimeMaxDate: string;
  /** Best successful load in the trailing 6 months (btwb's All-Time vs Current). */
  currentMax: number;
  bestE1rm: number | null;
  /** Failed sets across all sessions — a missed attempt is information. */
  missCount: number;
}

const BARBELL_DEFS = MOVEMENT_DEFS.filter((d) => d.barbellLift);

/**
 * Epley: load × (1 + reps/30). Capped at 10 reps — beyond that the formula is
 * fiction, and a 12-rep set isn't a max-effort attempt anyway.
 */
function epley(load: number, reps: number): number | null {
  if (reps < 1 || reps > 10) return null;
  // A single IS the demonstrated max — the formula would inflate it by 3.3%.
  if (reps === 1) return Math.round(load);
  return Math.round(load * (1 + reps / 30));
}

interface DefMatch {
  name: string;
  variantOf?: string;
  index: number;
  length: number;
}

/**
 * Which lift page a workout belongs to. Longest-match-wins resolves nested
 * mentions ("hang power clean" is Hang Cleans, not Power Cleans or Cleans;
 * "clean & jerk" is Clean & Jerks, not Jerks). A workout naming two distinct
 * lifts (a complex) gets one page under the joined name rather than polluting
 * both lifts' charts.
 */
export function liftNameFor(w: Workout): string | null {
  // Tags are singular ("Back Squat") — normalize through the taxonomy so
  // tagged and description-detected sessions land on the same page.
  const text = w.barbellLift || detectionText(w);
  const matches: DefMatch[] = [];
  for (const def of BARBELL_DEFS) {
    const m = def.pattern.exec(text);
    if (m) {
      matches.push({
        name: def.name,
        variantOf: def.variantOf,
        index: m.index,
        length: m[0].length,
      });
    }
  }
  if (matches.length === 0) return w.barbellLift ? w.barbellLift : null;

  // Longest match first; drop anything overlapping an already-kept match.
  matches.sort((a, b) => b.length - a.length || a.index - b.index);
  const kept: DefMatch[] = [];
  for (const m of matches) {
    const overlaps = kept.some((k) => m.index < k.index + k.length && k.index < m.index + m.length);
    if (!overlaps) kept.push(m);
  }
  // A parent whose variant also matched elsewhere ("clean pulls… squat cleans")
  // is the variant's page, not its own.
  const names = new Set(kept.map((k) => k.name));
  const resolved = kept.filter(
    (k) => !kept.some((v) => v.variantOf === k.name && names.has(v.name)),
  );

  resolved.sort((a, b) => a.index - b.index);
  return resolved.map((k) => k.name).join(' + ');
}

// --- Rep-scheme parsing (strength-day notation only; conservative — null over guess)

/**
 * Explicit rep mentions: SugarWOD per-set logging lines ("1: 3 reps # 2: 3
 * reps"), "EMOM 10: 2 reps", "5 reps @ 45%". Highest priority — these state
 * the reps actually performed, so they beat scheme notation like "3RM"
 * elsewhere in the text.
 */
const REPS_WORD = /(?<!\d)(\d{1,2})\s*reps?\b/gi;
/** "5x5", "3 x 10" — per-set reps is the second number. */
const SETS_X_REPS = /(?<!\d)(\d{1,2})\s*[x×]\s*(\d{1,3})(?!\d)/i;
/** "3RM", "1-rep max", "3 rep max". */
const REP_MAX = /(?<!\d)(\d{1,2})\s*(?:-|\s)?(?:rep\s*(?:-|\s)?max|rm\b)/i;
/** "5 sets of 3", "a set of 5". */
const SETS_OF = /sets?\s+of\s+(\d{1,2})\b/i;
/** "heavy single", "work to a heavy 3". */
const HEAVY_WORD = /heavy\s+(single|double|triple)/i;
const HEAVY_N = /heavy\s+(\d{1,2})\b/i;
/**
 * "3-3-3-1-1-1" — per-set rep ladder. Entries above 15 are load ladders
 * ("135-155-175"), not reps; the two-digit cap plus this guard rejects them.
 */
const REP_LADDER = /(?<!\d)(\d{1,2}(?:\s*-\s*\d{1,2}){2,})(?!\d)/;
const HEAVY_WORDS: Record<string, number> = { single: 1, double: 2, triple: 3 };

interface ParsedScheme {
  reps: number | null;
  /** Set-by-set reps when the scheme spells them out ("3-3-3-1-1-1"). */
  ladder: number[] | null;
}

export function parseRepScheme(text: string): ParsedScheme {
  const mentions = [...text.matchAll(REPS_WORD)].map((m) => Number(m[1]));
  if (mentions.length > 0) {
    if (mentions.every((n) => n === mentions[0])) return { reps: mentions[0], ladder: null };
    // Differing per-set counts ("1: 5 reps # 2: 3 reps # 3: 1 rep") pair with
    // logged sets the same way a "5-3-1" ladder does.
    return { reps: Math.min(...mentions), ladder: mentions };
  }
  const scheme = SETS_X_REPS.exec(text);
  if (scheme) return { reps: Number(scheme[2]), ladder: null };
  const rm = REP_MAX.exec(text);
  if (rm) return { reps: Number(rm[1]), ladder: null };
  const setsOf = SETS_OF.exec(text);
  if (setsOf) return { reps: Number(setsOf[1]), ladder: null };
  const heavyWord = HEAVY_WORD.exec(text);
  if (heavyWord) return { reps: HEAVY_WORDS[heavyWord[1].toLowerCase()], ladder: null };
  const heavyN = HEAVY_N.exec(text);
  if (heavyN) return { reps: Number(heavyN[1]), ladder: null };
  const ladder = REP_LADDER.exec(text);
  if (ladder) {
    const entries = ladder[1].split('-').map((n) => Number(n.trim()));
    if (entries.every((n) => n >= 1 && n <= 15)) {
      return { reps: Math.min(...entries), ladder: entries };
    }
  }
  return { reps: null, ladder: null };
}

// --- Session and page assembly

function sessionSets(w: Workout): LiftSet[] {
  const sets: LiftSet[] = [];
  for (const s of w.sets) {
    const load = typeof s.load === 'number' ? s.load : Number(s.load);
    if (!Number.isFinite(load) || load <= 0) continue;
    sets.push({ load, success: s.success !== false, reps: null });
  }
  // Load workouts scored without set details still carry the top lift as scoreRaw.
  if (sets.length === 0 && w.scoreRaw != null && w.scoreRaw > 0) {
    sets.push({ load: w.scoreRaw, success: true, reps: null });
  }
  return sets;
}

function buildSession(w: Workout, sets: LiftSet[]): LiftSession {
  const successful = sets.filter((s) => s.success);
  const topLoad = Math.max(...(successful.length > 0 ? successful : sets).map((s) => s.load));
  const { reps, ladder } = parseRepScheme(detectionText(w));

  const paired = ladder != null && ladder.length === sets.length;
  for (let i = 0; i < sets.length; i++) {
    sets[i].reps = paired ? ladder[i] : ladder == null ? reps : null;
  }

  let e1rm: number | null = null;
  let sessionReps = reps;
  if (successful.length === 0) {
    // An all-miss session estimates nothing.
  } else if (ladder != null && ladder.length === sets.length) {
    // Scheme entries line up with logged sets ("3-3-3-1-1-1" and 6 sets):
    // estimate per set and keep the best — the heavy single may out-estimate
    // the earlier triples or not; the pairing decides.
    for (let i = 0; i < sets.length; i++) {
      if (!sets[i].success) continue;
      const est = epley(sets[i].load, ladder[i]);
      if (est != null && (e1rm == null || est > e1rm)) {
        e1rm = est;
        sessionReps = ladder[i];
      }
    }
  } else if (reps != null) {
    e1rm = epley(topLoad, reps);
  }

  return { workoutId: w.id, date: w.date, topLoad, sets, reps: sessionReps, e1rm };
}

/**
 * Every lift's full history, sorted by all-time max descending. `todayIso`
 * anchors the trailing-6-month current-max window (defaults to the real today;
 * tests pass a fixed date).
 */
export function liftPages(list: Workout[], todayIso?: string): LiftPage[] {
  // UTC calendar math like benchmarks' daysBetween — parsing the ISO date as
  // UTC and mutating in local time drifts a day across DST boundaries.
  const [ty, tm, td] = (todayIso ?? localTodayIso()).split('-').map(Number);
  const cutoff = new Date(Date.UTC(ty, tm - 1 - 6, td)).toISOString().slice(0, 10);

  const byLift = new Map<string, LiftSession[]>();
  for (const w of list) {
    if (w.scoreType !== 'Load') continue;
    const sets = sessionSets(w);
    if (sets.length === 0) continue;
    const lift = liftNameFor(w);
    if (!lift) continue;
    const sessions = byLift.get(lift);
    if (sessions) sessions.push(buildSession(w, sets));
    else byLift.set(lift, [buildSession(w, sets)]);
  }

  const pages: LiftPage[] = [];
  for (const [lift, sessions] of byLift) {
    sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let allTimeMax = 0;
    let allTimeMaxDate = '';
    let currentMax = 0;
    let bestE1rm: number | null = null;
    let missCount = 0;
    for (const s of sessions) {
      for (const set of s.sets) {
        if (!set.success) {
          missCount++;
          continue;
        }
        if (set.load > allTimeMax) {
          allTimeMax = set.load;
          allTimeMaxDate = s.date;
        }
        if (s.date >= cutoff && set.load > currentMax) currentMax = set.load;
      }
      if (s.e1rm != null && (bestE1rm == null || s.e1rm > bestE1rm)) bestE1rm = s.e1rm;
    }
    pages.push({ lift, sessions, allTimeMax, allTimeMaxDate, currentMax, bestE1rm, missCount });
  }
  return pages.sort((a, b) => b.allTimeMax - a.allTimeMax);
}

/** The whiteboard moment: 95%→50% of a max in steps of 5, rounded to 5 lb. */
export function percentTable(max: number): { pct: number; load: number }[] {
  const rows: { pct: number; load: number }[] = [];
  for (let pct = 95; pct >= 50; pct -= 5) {
    rows.push({ pct, load: Math.round((max * pct) / 100 / 5) * 5 });
  }
  return rows;
}
