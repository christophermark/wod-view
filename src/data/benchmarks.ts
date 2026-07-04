// Benchmark WOD catalog (docs/features/05-benchmarks.md). Committed static
// reference data — no personal information. Detection logic lives in
// src/lib/benchmarks.ts; this module is data only.
//
// `movements` entries are taxonomy canonical names (movements.ts) — a unit
// test enforces the linkage. They confirm ambiguous name hits: "Karen" in a
// description without Wall Balls is a person, not the WOD.
//
// `standards` are published community level tables (PRzilla / WOD Time
// Calculator style), rounded — time WODs in seconds. Where no table is
// commonly published, `standards` is omitted rather than invented; AMRAP
// benchmarks are omitted too because SugarWOD's raw "Rounds + Reps" score
// drops the partial reps, so level math would be wrong.

export interface BenchmarkDef {
  name: string; // 'Fran'
  category: 'girl' | 'hero' | 'open' | 'other';
  aliases?: RegExp; // 'Open 24.1' | '24.1' etc.
  lowerIsBetter: boolean; // time WODs true; AMRAPs false
  /** Movement names (taxonomy canonical) used to confirm ambiguous matches. */
  movements: string[];
  /** Published level standards in score units; omit when none exist. */
  standards?: { beginner: number; intermediate: number; advanced: number; elite: number };
}

const min = (m: number, s = 0) => m * 60 + s;

export const BENCHMARK_DEFS: BenchmarkDef[] = [
  // --- The Girls
  {
    name: 'Fran',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Thrusters', 'Pull-Ups'],
    standards: { beginner: min(10), intermediate: min(7), advanced: min(5), elite: min(3) },
  },
  {
    name: 'Grace',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Cleans', 'Jerks'],
    standards: {
      beginner: min(6, 30),
      intermediate: min(4, 30),
      advanced: min(3),
      elite: min(1, 45),
    },
  },
  {
    name: 'Helen',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Running', 'KB Swings', 'Pull-Ups'],
    standards: {
      beginner: min(14),
      intermediate: min(11, 30),
      advanced: min(9, 30),
      elite: min(8),
    },
  },
  {
    name: 'Cindy',
    category: 'girl',
    lowerIsBetter: false,
    movements: ['Pull-Ups', 'Push-Ups', 'Air Squats'],
  },
  {
    name: 'Diane',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Deadlifts', 'HSPU'],
    standards: { beginner: min(12), intermediate: min(8), advanced: min(5), elite: min(3) },
  },
  {
    name: 'Karen',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Wall Balls'],
    standards: { beginner: min(12), intermediate: min(9), advanced: min(7), elite: min(5) },
  },
  {
    name: 'Isabel',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Snatches'],
    standards: {
      beginner: min(8),
      intermediate: min(5, 30),
      advanced: min(3, 30),
      elite: min(2),
    },
  },
  {
    name: 'Jackie',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Rowing', 'Thrusters', 'Pull-Ups'],
    standards: {
      beginner: min(14),
      intermediate: min(11),
      advanced: min(8, 30),
      elite: min(6, 30),
    },
  },
  {
    name: 'Elizabeth',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Cleans', 'Ring Dips'],
    standards: {
      beginner: min(12),
      intermediate: min(8, 30),
      advanced: min(6),
      elite: min(4),
    },
  },
  {
    name: 'Annie',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Double Unders', 'Sit-Ups'],
    standards: { beginner: min(12), intermediate: min(9), advanced: min(7), elite: min(5) },
  },
  {
    name: 'Barbara',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Pull-Ups', 'Push-Ups', 'Sit-Ups', 'Air Squats'],
  },
  {
    name: 'Chelsea',
    category: 'girl',
    lowerIsBetter: false,
    movements: ['Pull-Ups', 'Push-Ups', 'Air Squats'],
  },
  {
    name: 'Mary',
    category: 'girl',
    lowerIsBetter: false,
    movements: ['HSPU', 'Pistols', 'Pull-Ups'],
  },
  {
    name: 'Nancy',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Running', 'Overhead Squats'],
    standards: {
      beginner: min(17),
      intermediate: min(13, 30),
      advanced: min(11),
      elite: min(9),
    },
  },
  {
    name: 'Kelly',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Running', 'Box Jumps', 'Wall Balls'],
    standards: { beginner: min(30), intermediate: min(24), advanced: min(20), elite: min(16) },
  },
  {
    name: 'Angie',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Pull-Ups', 'Push-Ups', 'Sit-Ups', 'Air Squats'],
    standards: { beginner: min(28), intermediate: min(22), advanced: min(17), elite: min(13) },
  },
  {
    name: 'Amanda',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Muscle-Ups', 'Snatches'],
  },
  {
    name: 'Eva',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Running', 'KB Swings', 'Pull-Ups'],
  },
  {
    name: 'Nicole',
    category: 'girl',
    lowerIsBetter: false,
    movements: ['Running', 'Pull-Ups'],
  },
  {
    name: 'Christine',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Rowing', 'Deadlifts', 'Box Jumps'],
  },
  {
    name: 'Linda',
    category: 'girl',
    lowerIsBetter: true,
    movements: ['Deadlifts', 'Bench Press', 'Cleans'],
  },
  {
    name: 'Lynne',
    category: 'girl',
    lowerIsBetter: false,
    movements: ['Bench Press', 'Pull-Ups'],
  },

  // --- Heroes
  {
    name: 'Murph',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Running', 'Pull-Ups', 'Push-Ups', 'Air Squats'],
    standards: { beginner: min(70), intermediate: min(55), advanced: min(45), elite: min(35) },
  },
  {
    name: 'DT',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Deadlifts', 'Cleans', 'Jerks'],
    standards: {
      beginner: min(17),
      intermediate: min(13),
      advanced: min(9, 30),
      elite: min(6, 30),
    },
  },
  {
    name: 'JT',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['HSPU', 'Ring Dips', 'Push-Ups'],
  },
  {
    name: 'Michael',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Running', 'Hip Extensions', 'Sit-Ups'],
  },
  {
    name: 'Randy',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Snatches'],
  },
  {
    name: 'Chad',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Step-Ups'],
  },
  {
    name: 'Nate',
    category: 'hero',
    lowerIsBetter: false,
    movements: ['Muscle-Ups', 'HSPU', 'KB Swings'],
  },
  {
    name: 'Daniel',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Pull-Ups', 'Running', 'Thrusters'],
  },
  {
    name: 'Josh',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Overhead Squats', 'Pull-Ups'],
  },
  {
    name: 'Badger',
    category: 'hero',
    lowerIsBetter: true,
    movements: ['Cleans', 'Pull-Ups', 'Running'],
  },

  // --- CrossFit Open ("24.1", "Open 25.2", …). One def; matchBenchmark
  // derives a per-workout name ("Open 24.1") from the matched code. Most Open
  // scores are reps, so higher is better; capped-time exceptions are rare
  // enough to accept.
  {
    name: 'Open',
    category: 'open',
    aliases: /\b2[0-9]\.[1-3][ab]?\b/i,
    lowerIsBetter: false,
    movements: [],
  },

  // --- Named classics that aren't Girls or Heroes
  {
    name: 'Fight Gone Bad',
    category: 'other',
    lowerIsBetter: false,
    movements: ['Wall Balls', 'SDHP', 'Box Jumps', 'Push Press', 'Rowing'],
  },
  {
    name: 'Filthy Fifty',
    category: 'other',
    lowerIsBetter: true,
    movements: [
      'Box Jumps',
      'Pull-Ups',
      'KB Swings',
      'Lunges',
      'Toes-to-Bar',
      'Push Press',
      'Wall Balls',
      'Burpees',
      'Double Unders',
    ],
  },
];
