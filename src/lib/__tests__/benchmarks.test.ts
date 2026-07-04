import { BENCHMARK_DEFS, BenchmarkDef } from '../../data/benchmarks';
import {
  benchmarkByName,
  benchmarkHistory,
  benchmarkStanding,
  bestAttempt,
  daysBetween,
  formatSeconds,
  matchBenchmark,
  retestRadar,
} from '../benchmarks';
import { MOVEMENT_DEFS } from '../movements';
import { Workout } from '../workouts';

let nextId = 0;
function wod(overrides: Partial<Workout>): Workout {
  return {
    id: `test-${nextId++}`,
    date: '2026-01-05',
    title: 'Monday - 1.5.2026',
    description: '',
    score: '',
    scoreRaw: null,
    scoreType: '',
    barbellLift: '',
    sets: [],
    notes: '',
    rx: true,
    pr: false,
    ...overrides,
  };
}

function matchName(overrides: Partial<Workout>) {
  return matchBenchmark(wod(overrides))?.name ?? null;
}

describe('BENCHMARK_DEFS', () => {
  test('names are unique', () => {
    const names = BENCHMARK_DEFS.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('every movement is a taxonomy canonical name', () => {
    const taxonomy = new Set(MOVEMENT_DEFS.map((d) => d.name));
    for (const def of BENCHMARK_DEFS) {
      for (const m of def.movements) expect(taxonomy).toContain(m);
    }
  });

  test('standards are ordered beginner → elite in score direction', () => {
    for (const def of BENCHMARK_DEFS) {
      if (!def.standards) continue;
      const { beginner, intermediate, advanced, elite } = def.standards;
      const seq = [beginner, intermediate, advanced, elite];
      for (let i = 1; i < seq.length; i++) {
        if (def.lowerIsBetter) expect(seq[i]).toBeLessThan(seq[i - 1]);
        else expect(seq[i]).toBeGreaterThan(seq[i - 1]);
      }
    }
  });
});

describe('matchBenchmark — detection', () => {
  test('quoted name in the title matches', () => {
    expect(
      matchName({ title: '"FRAN"', description: 'FOR TIME:\n21-15-9\nThrusters 95#\nPull-Ups' }),
    ).toBe('Fran');
  });

  test('quoted name in the description matches without movements', () => {
    expect(matchName({ description: 'Today we retest "Grace"!\nDetails at the whiteboard' })).toBe(
      'Grace',
    );
  });

  test('Benchmark/Hero keyword is a strong signal', () => {
    expect(matchName({ description: 'Benchmark: Diane\n21-15-9\nDeadlifts 225#\nHSPU' })).toBe(
      'Diane',
    );
    expect(matchName({ description: 'Hero WOD Chad\n1000 Box Step-Ups 20"' })).toBe('Chad');
  });

  test('bare name confirmed when ≥ half the movements are present', () => {
    expect(matchName({ description: 'Karen\nFOR TIME:\n150 Wall Balls 20#/14#' })).toBe('Karen');
  });

  test('bare name without confirming movements is a person', () => {
    expect(matchName({ description: 'Partner WOD with Karen\n3 Rounds\n10 Burpees' })).toBeNull();
  });

  test('names in weekday titles are coaches, not benchmarks', () => {
    expect(
      matchName({
        title: 'Tuesday 7.4.2023 Coach Grace/Dana',
        description: '5 Rounds\n10 Burpees\n200m Run',
      }),
    ).toBeNull();
  });

  test('"Coach <name>" in the description is stripped before matching', () => {
    expect(
      matchName({ description: 'Coach Karen says pace the wall balls\n150 Wall Balls 20#' }),
    ).toBeNull();
  });

  test('non-weekday title with matching movements confirms', () => {
    expect(
      matchName({
        title: 'Helen',
        description: 'FOR TIME:\n3 Rounds:\n400m Run\n21 KB Swings 53#\n12 Pull-Ups',
      }),
    ).toBe('Helen');
  });

  test('empty workout matches nothing', () => {
    expect(matchName({ description: '' })).toBeNull();
  });
});

describe('matchBenchmark — Open', () => {
  test('Open title yields a per-workout derived name', () => {
    expect(matchName({ title: 'Open 24.1', description: '15:00 AMRAP\nSnatches\nBurpees' })).toBe(
      'Open 24.1',
    );
  });

  test('bare code in the description matches', () => {
    expect(matchName({ description: '20:00 cap\n*CrossFit Open 26.3' })).toBe('Open 26.3');
    expect(matchName({ description: 'Repeat of 23.2a today' })).toBe('Open 23.2a');
  });

  test('dates like 6.24.15 are not Open codes', () => {
    expect(
      matchName({ title: 'Wednesday 6.24.15', description: '3 Rounds\n10 Burpees' }),
    ).toBeNull();
    expect(matchName({ description: 'Since 3.21.14 we row every Friday' })).toBeNull();
  });

  test('derived Open names resolve back to the Open def', () => {
    const def = benchmarkByName('Open 24.1');
    expect(def?.category).toBe('open');
    expect(def?.name).toBe('Open 24.1');
  });
});

describe('benchmarkHistory', () => {
  const list = [
    // Newest-first, as useWorkouts() provides.
    wod({ date: '2026-04-10', title: '"FRAN"', description: '21-15-9\nThrusters 95#\nPull-Ups' }),
    wod({ date: '2025-11-11', title: '"GRACE"', description: '30 Clean and Jerks 135#' }),
    wod({ date: '2025-10-22', title: '"FRAN"', description: '21-15-9\nThrusters 95#\nPull-Ups' }),
    wod({ date: '2025-01-15', title: 'Thursday 1.15.2025', description: '5 Rounds\n10 Burpees' }),
  ];

  test('groups attempts by name, oldest first', () => {
    const history = benchmarkHistory(list);
    expect([...history.keys()].sort()).toEqual(['Fran', 'Grace']);
    expect(history.get('Fran')!.map((w) => w.date)).toEqual(['2025-10-22', '2026-04-10']);
  });
});

describe('bestAttempt', () => {
  const fran = BENCHMARK_DEFS.find((d) => d.name === 'Fran')!;
  const cindy = BENCHMARK_DEFS.find((d) => d.name === 'Cindy')!;

  test('lower-is-better picks the fastest time', () => {
    const attempts = [
      wod({ date: '2025-01-01', score: '8:57', scoreRaw: 537 }),
      wod({ date: '2025-06-01', score: '8:32', scoreRaw: 512 }),
      wod({ date: '2026-01-01', score: '9:10', scoreRaw: 550 }),
    ];
    expect(bestAttempt(fran, attempts)?.scoreRaw).toBe(512);
  });

  test('higher-is-better picks the biggest score and skips unscored attempts', () => {
    const attempts = [
      wod({ date: '2025-01-01', scoreRaw: null }),
      wod({ date: '2025-06-01', score: '17', scoreRaw: 17 }),
      wod({ date: '2026-01-01', score: '15', scoreRaw: 15 }),
    ];
    expect(bestAttempt(cindy, attempts)?.scoreRaw).toBe(17);
  });

  test('returns null when nothing is scored', () => {
    expect(bestAttempt(fran, [wod({ scoreRaw: null })])).toBeNull();
  });
});

describe('retestRadar', () => {
  const TODAY = '2026-07-04';
  const franAt = (date: string) =>
    wod({ date, title: '"FRAN"', description: '21-15-9\nThrusters 95#\nPull-Ups' });
  const helenAt = (date: string) =>
    wod({ date, title: '"HELEN"', description: '3 Rounds\n400m Run\n21 KB Swings\n12 Pull-Ups' });

  test('day math against a fixed today', () => {
    const radar = retestRadar([franAt('2025-12-02')], TODAY);
    expect(radar).toHaveLength(1);
    expect(radar[0].def.name).toBe('Fran');
    expect(radar[0].lastDate).toBe('2025-12-02');
    expect(radar[0].daysSince).toBe(214);
  });

  test('threshold is 112 days, measured from the latest attempt', () => {
    // Last attempt 111 days back — the older one must not resurrect it.
    const recent = [franAt('2026-03-15'), franAt('2024-01-01')];
    expect(retestRadar(recent, TODAY)).toHaveLength(0);
    expect(retestRadar([franAt('2026-03-14')], TODAY)[0]?.daysSince).toBe(112);
  });

  test('sorted most-overdue first; Open workouts excluded', () => {
    const list = [
      helenAt('2025-10-28'),
      franAt('2026-01-10'),
      wod({ date: '2024-03-01', title: 'Open 24.1', description: '15:00 AMRAP\nBurpees' }),
    ];
    const radar = retestRadar(list, TODAY);
    expect(radar.map((r) => r.def.name)).toEqual(['Helen', 'Fran']);
  });
});

describe('benchmarkStanding', () => {
  const def: BenchmarkDef = {
    name: 'Test',
    category: 'girl',
    lowerIsBetter: true,
    movements: [],
    standards: { beginner: 600, intermediate: 420, advanced: 320, elite: 180 },
  };

  test('5:40 with a 5:20 advanced cutoff reads intermediate, 20s off', () => {
    expect(benchmarkStanding(def, 340)).toEqual({
      level: 'intermediate',
      next: 'advanced',
      gap: 20,
    });
  });

  test('elite has nothing left to chase', () => {
    expect(benchmarkStanding(def, 170)).toEqual({ level: 'elite', next: null, gap: null });
  });

  test('slower than beginner still shows the gap to beginner', () => {
    expect(benchmarkStanding(def, 650)).toEqual({ level: null, next: 'beginner', gap: 50 });
  });

  test('higher-is-better direction', () => {
    const amrap = {
      ...def,
      lowerIsBetter: false,
      standards: { beginner: 10, intermediate: 14, advanced: 18, elite: 23 },
    };
    expect(benchmarkStanding(amrap, 16)).toEqual({
      level: 'intermediate',
      next: 'advanced',
      gap: 2,
    });
  });

  test('null without published standards', () => {
    expect(benchmarkStanding({ ...def, standards: undefined }, 340)).toBeNull();
  });
});

describe('formatting helpers', () => {
  test('formatSeconds', () => {
    expect(formatSeconds(20)).toBe('0:20');
    expect(formatSeconds(537)).toBe('8:57');
    expect(formatSeconds(3017)).toBe('50:17');
  });

  test('daysBetween is calendar math', () => {
    expect(daysBetween('2025-12-02', '2026-07-04')).toBe(214);
    expect(daysBetween('2026-07-04', '2026-07-04')).toBe(0);
  });
});
