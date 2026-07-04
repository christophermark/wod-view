// Benchmark detection over workout history (docs/features/05-benchmarks.md).
// Pure module: no React/React Native/Node imports.
//
// False positives are the design problem: titles like "Tuesday 7.4.2023
// Coach Grace/Dana" mean Girl names double as people names. A name only
// counts when it appears in the description or a non-weekday title, and a
// bare (unquoted, keyword-less) hit must be confirmed by the benchmark's
// movements actually appearing in the workout.

import { BENCHMARK_DEFS, BenchmarkDef } from '../data/benchmarks';
import { detectMovements } from './movements';
import { parseDate, Workout } from './workouts';

/** Coaching consensus says retest every 8–16 weeks; radar flags past 16. */
export const RETEST_THRESHOLD_DAYS = 112;

/** "Tuesday 7.4.2023 Coach Marcus/Dana" — names in these titles are people. */
const WEEKDAY_TITLE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
/** "Coach Grace", "Coach Marcus/Dana" — stripped before name matching. */
const COACH_NAMES = /\bcoach\s+[a-z]+(?:\s*\/\s*[a-z]+)?/gi;
/** Nearby vocabulary that marks a name as a WOD, not a person. */
const STRONG_KEYWORD = /\bbenchmarks?\b|\bgirls?\b|\bhero(?:es)?\b/i;

const QUOTES = `["'“”‘’]`;
const nameRe = new Map<string, RegExp>();
const quotedRe = new Map<string, RegExp>();
for (const def of BENCHMARK_DEFS) {
  nameRe.set(def.name, new RegExp(`\\b${def.name}\\b`, 'i'));
  quotedRe.set(def.name, new RegExp(`${QUOTES}\\s*${def.name}\\s*${QUOTES}`, 'i'));
}

/**
 * Matches a workout against the benchmark catalog. Open workouts return a
 * derived def named after the matched code ("Open 24.1"); everything else
 * returns the catalog def itself. Strong signals (quoted name, benchmark
 * keyword, Open code) win over movement-confirmed bare names.
 */
export function matchBenchmark(w: Workout): BenchmarkDef | null {
  const texts = [w.description];
  if (w.title && !WEEKDAY_TITLE.test(w.title)) texts.push(w.title);
  const cleaned = texts.map((t) => t.replace(COACH_NAMES, ' '));

  let confirmed: BenchmarkDef | null = null;
  let detected: Set<string> | null = null;

  for (const def of BENCHMARK_DEFS) {
    if (def.category === 'open') {
      for (const text of cleaned) {
        const code = def.aliases?.exec(text)?.[0];
        if (code) return { ...def, name: `Open ${code.toLowerCase()}` };
      }
      continue;
    }
    const hitText = cleaned.find((t) => nameRe.get(def.name)!.test(t));
    if (hitText == null) continue;
    if (quotedRe.get(def.name)!.test(hitText) || STRONG_KEYWORD.test(hitText)) return def;
    if (!confirmed && def.movements.length > 0) {
      detected ??= new Set(detectMovements(w.description).map((d) => d.def.name));
      const present = def.movements.filter((m) => detected!.has(m)).length;
      if (present * 2 >= def.movements.length) confirmed = def;
    }
  }
  return confirmed;
}

/** Looks up the catalog def behind a history key, including derived Open names. */
export function benchmarkByName(name: string): BenchmarkDef | null {
  const open = BENCHMARK_DEFS.find((d) => d.category === 'open')!;
  if (name.startsWith(`${open.name} `)) return { ...open, name };
  return BENCHMARK_DEFS.find((d) => d.name === name) ?? null;
}

/** name → attempts, oldest first. */
export function benchmarkHistory(list: Workout[]): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>();
  for (const w of list) {
    const def = matchBenchmark(w);
    if (!def) continue;
    const attempts = map.get(def.name);
    if (attempts) attempts.push(w);
    else map.set(def.name, [w]);
  }
  for (const attempts of map.values()) {
    attempts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  return map;
}

/** The device's calendar date as ISO yyyy-mm-dd (for retest math). */
export function todayIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Whole days between two ISO dates (calendar math, DST-proof). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseDate(fromIso);
  const b = parseDate(toIso);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000,
  );
}

export interface RetestEntry {
  def: BenchmarkDef;
  lastDate: string;
  daysSince: number;
}

/**
 * Benchmarks with ≥1 past attempt whose last attempt is over the retest
 * threshold, most-overdue first. Open workouts are excluded — they're annual
 * events, not retest targets.
 */
export function retestRadar(list: Workout[], todayIso: string): RetestEntry[] {
  const out: RetestEntry[] = [];
  for (const [name, attempts] of benchmarkHistory(list)) {
    const def = benchmarkByName(name)!;
    if (def.category === 'open') continue;
    const lastDate = attempts[attempts.length - 1].date;
    const daysSince = daysBetween(lastDate, todayIso);
    if (daysSince >= RETEST_THRESHOLD_DAYS) out.push({ def, lastDate, daysSince });
  }
  return out.sort((a, b) => b.daysSince - a.daysSince);
}

/** The attempt with the best raw score, honoring lowerIsBetter. Null when nothing is scored. */
export function bestAttempt(def: BenchmarkDef, attempts: Workout[]): Workout | null {
  let best: Workout | null = null;
  for (const w of attempts) {
    if (w.scoreRaw == null) continue;
    if (
      best == null ||
      (def.lowerIsBetter ? w.scoreRaw < best.scoreRaw! : w.scoreRaw > best.scoreRaw!)
    ) {
      best = w;
    }
  }
  return best;
}

export type Level = 'beginner' | 'intermediate' | 'advanced' | 'elite';
/** Worst → best; also the chart's band order. */
export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced', 'elite'];

export interface Standing {
  /** Best level the score meets, or null when it misses even beginner. */
  level: Level | null;
  /** The level above, when there is one to chase. */
  next: Level | null;
  /** Score units between the score and `next` (always positive). */
  gap: number | null;
}

/** Places a raw score on the def's published standards; null without standards. */
export function benchmarkStanding(def: BenchmarkDef, scoreRaw: number): Standing | null {
  const s = def.standards;
  if (!s) return null;
  const meets = (level: Level) => (def.lowerIsBetter ? scoreRaw <= s[level] : scoreRaw >= s[level]);
  let level: Level | null = null;
  for (const l of LEVELS) {
    if (meets(l)) level = l;
    else break;
  }
  if (level === 'elite') return { level, next: null, gap: null };
  const next = level == null ? LEVELS[0] : LEVELS[LEVELS.indexOf(level) + 1];
  const gap = def.lowerIsBetter ? scoreRaw - s[next] : s[next] - scoreRaw;
  return { level, next, gap };
}

/** 537 → "8:57" — for standards and gaps on time-scored benchmarks. */
export function formatSeconds(total: number): string {
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
