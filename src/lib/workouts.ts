// Pure types and helpers for workout data. This module must stay free of
// React/React Native imports so it can be unit tested and reused by the
// Node convert script. Screens get their data from WorkoutsProvider
// (data-context.tsx), never from module-level singletons here.

export interface Workout {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  description: string;
  score: string;
  scoreRaw: number | null;
  scoreType: string;
  barbellLift: string;
  sets: Record<string, number | boolean | string>[];
  notes: string;
  rx: boolean;
  pr: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function monthName(month: number) {
  return MONTH_NAMES[month - 1];
}

export function dayOfWeek(iso: string) {
  const { year, month, day } = parseDate(iso);
  return DAY_NAMES[new Date(year, month - 1, day).getDay()];
}

export function formatDate(iso: string) {
  const { year, month, day } = parseDate(iso);
  return `${dayOfWeek(iso)}, ${monthName(month)} ${day}, ${year}`;
}

/** Human label for how a workout is scored. */
export function scoreLabel(w: Workout): string {
  if (w.scoreType) return w.scoreType;
  if (/^\d+:\d+$/.test(w.score)) return 'Time';
  return 'Score';
}

export interface MonthSection {
  key: string; // yyyy-mm
  title: string; // "June 2026"
  data: Workout[];
}

/** Groups a newest-first workout list into month sections. */
export function groupByMonth(list: Workout[]): MonthSection[] {
  const sections: MonthSection[] = [];
  let current: MonthSection | null = null;
  for (const w of list) {
    const key = w.date.slice(0, 7);
    if (!current || current.key !== key) {
      const { year, month } = parseDate(w.date);
      current = { key, title: `${monthName(month)} ${year}`, data: [] };
      sections.push(current);
    }
    current.data.push(w);
  }
  return sections;
}

/** Sessions per calendar month (index 0 = January) for one year. */
export function sessionsByMonth(list: Workout[], year: number): number[] {
  const counts = new Array<number>(12).fill(0);
  for (const w of list) {
    const { year: y, month } = parseDate(w.date);
    if (y === year) counts[month - 1]++;
  }
  return counts;
}

/** date (yyyy-mm-dd) → workouts on that day */
export function buildWorkoutsByDate(list: Workout[]) {
  const map = new Map<string, Workout[]>();
  for (const w of list) {
    const existing = map.get(w.date);
    if (existing) existing.push(w);
    else map.set(w.date, [w]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Stats

export interface YearCount {
  year: number;
  count: number;
}

export interface LiftBest {
  lift: string;
  best: number;
  date: string;
  attempts: number;
}

export interface MovementCount {
  name: string;
  count: number;
}

const MOVEMENTS: [name: string, pattern: RegExp][] = [
  ['Burpees', /burpee/i],
  ['Wall Balls', /wall ?ball/i],
  ['Box Jumps', /box jump/i],
  ['Deadlifts', /deadlift/i],
  ['Double Unders', /double under/i],
  ['Pull-Ups', /pull-? ?up/i],
  ['Push-Ups', /push-? ?up/i],
  ['Running', /\b\d+ ?m (run|row)|run\b/i],
  ['Rowing', /\brow(ing)?\b|calorie row/i],
  ['KB Swings', /(kb|kettlebell).{0,20}swing|swing.{0,20}(kb|kettlebell)/i],
  ['Snatches', /snatch/i],
  ['Cleans', /clean/i],
  ['Thrusters', /thruster/i],
  ['Front Squats', /front squat/i],
  ['Back Squats', /back squat/i],
  ['Lunges', /lunge/i],
  ['Sit-Ups', /sit-? ?up/i],
  ['Toes-to-Bar', /toes.{0,3}(2|to).{0,3}bar|t2b/i],
  ['HSPU', /hspu|handstand push/i],
  ['Rope Climbs', /rope climb/i],
  ['Push Press', /push press/i],
  ['Overhead Squats', /overhead squat|ohs/i],
  ['Muscle-Ups', /muscle-? ?up/i],
];

export interface Stats {
  total: number;
  prCount: number;
  rxCount: number;
  rxRate: number; // 0..1
  firstDate: string;
  lastDate: string;
  activeDays: number;
  years: YearCount[];
  maxYearCount: number;
  liftBests: LiftBest[];
  /** Every detectable movement with its appearance count, most frequent first. */
  movementCounts: MovementCount[];
  busiestMonth: { title: string; count: number };
  longestStreakWeeks: number; // consecutive calendar weeks with ≥1 workout
}

function weekIndex(iso: string): number {
  const { year, month, day } = parseDate(iso);
  const date = new Date(year, month - 1, day);
  return Math.floor(date.getTime() / (7 * 24 * 3600 * 1000));
}

/** Computes lifetime stats from a newest-first workout list. */
export function computeStats(workouts: Workout[]): Stats {
  const total = workouts.length;
  const prCount = workouts.filter((w) => w.pr).length;
  const rxCount = workouts.filter((w) => w.rx).length;
  const firstDate = workouts[workouts.length - 1].date;
  const lastDate = workouts[0].date;
  const activeDays = buildWorkoutsByDate(workouts).size;

  const yearMap = new Map<number, number>();
  for (const w of workouts) {
    const y = parseDate(w.date).year;
    yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
  }
  const years = [...yearMap.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
  const maxYearCount = Math.max(...years.map((y) => y.count));

  const liftMap = new Map<string, LiftBest>();
  for (const w of workouts) {
    if (!w.barbellLift || w.scoreType !== 'Load' || w.scoreRaw == null) continue;
    const prev = liftMap.get(w.barbellLift);
    if (!prev) {
      liftMap.set(w.barbellLift, {
        lift: w.barbellLift,
        best: w.scoreRaw,
        date: w.date,
        attempts: 1,
      });
    } else {
      prev.attempts++;
      if (w.scoreRaw > prev.best) {
        prev.best = w.scoreRaw;
        prev.date = w.date;
      }
    }
  }
  const liftBests = [...liftMap.values()].sort((a, b) => b.best - a.best);

  // Zero-count movements stay in — "never programmed" is a stat too.
  const movementCounts = MOVEMENTS.map(([name, pattern]) => ({
    name,
    count: workouts.filter((w) => pattern.test(w.description)).length,
  })).sort((a, b) => b.count - a.count);

  const monthMap = new Map<string, number>();
  for (const w of workouts) {
    const key = w.date.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  let busiestKey = '';
  let busiestCount = 0;
  for (const [key, count] of monthMap) {
    if (count > busiestCount) {
      busiestCount = count;
      busiestKey = key;
    }
  }
  const [by, bm] = busiestKey.split('-').map(Number);
  const busiestMonth = { title: `${monthName(bm)} ${by}`, count: busiestCount };

  const weeks = [...new Set(workouts.map((w) => weekIndex(w.date)))].sort((a, b) => a - b);
  let longestStreakWeeks = 0;
  let run = 0;
  let prevWeek = Number.NaN;
  for (const wk of weeks) {
    run = wk === prevWeek + 1 ? run + 1 : 1;
    longestStreakWeeks = Math.max(longestStreakWeeks, run);
    prevWeek = wk;
  }

  return {
    total,
    prCount,
    rxCount,
    rxRate: rxCount / total,
    firstDate,
    lastDate,
    activeDays,
    years,
    maxYearCount,
    liftBests,
    movementCounts,
    busiestMonth,
    longestStreakWeeks,
  };
}
