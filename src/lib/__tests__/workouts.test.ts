import {
  buildWorkoutsByDate,
  computeStats,
  formatDate,
  groupByMonth,
  scoreLabel,
  sessionsByMonth,
  Workout,
} from '../workouts';

let seq = 0;
function workout(overrides: Partial<Workout>): Workout {
  return {
    id: `w${seq++}`,
    date: '2025-01-01',
    title: 'Test WOD',
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

describe('scoreLabel', () => {
  it('uses the explicit score type when present', () => {
    expect(scoreLabel(workout({ scoreType: 'Reps' }))).toBe('Reps');
  });

  it('infers Time from mm:ss scores with no type', () => {
    expect(scoreLabel(workout({ score: '14:46' }))).toBe('Time');
    expect(scoreLabel(workout({ score: 'something' }))).toBe('Score');
  });
});

describe('formatDate', () => {
  it('formats ISO dates with weekday', () => {
    expect(formatDate('2025-01-06')).toBe('Mon, January 6, 2025');
  });
});

describe('groupByMonth', () => {
  it('groups a newest-first list into month sections', () => {
    const sections = groupByMonth([
      workout({ date: '2025-02-10' }),
      workout({ date: '2025-02-03' }),
      workout({ date: '2025-01-15' }),
    ]);
    expect(sections.map((s) => s.title)).toEqual(['February 2025', 'January 2025']);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].data).toHaveLength(1);
  });
});

describe('buildWorkoutsByDate', () => {
  it('groups multiple workouts on the same day', () => {
    const map = buildWorkoutsByDate([
      workout({ date: '2025-01-06' }),
      workout({ date: '2025-01-06' }),
      workout({ date: '2025-01-07' }),
    ]);
    expect(map.get('2025-01-06')).toHaveLength(2);
    expect(map.size).toBe(2);
  });
});

describe('computeStats', () => {
  it('returns zeroed stats for an empty list (pre-import production state)', () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.rxRate).toBe(0);
    expect(stats.years).toEqual([]);
    expect(stats.maxYearCount).toBe(0);
    expect(stats.liftBests).toEqual([]);
    expect(stats.longestStreakWeeks).toBe(0);
    expect(stats.movementCounts.every((m) => m.count === 0)).toBe(true);
  });

  // Newest-first, like real data
  const list = [
    workout({ date: '2025-01-20', rx: true }),
    workout({
      date: '2025-01-13',
      rx: false,
      scoreType: 'Load',
      barbellLift: 'Deadlift',
      scoreRaw: 275,
      pr: true,
    }),
    workout({
      date: '2025-01-08',
      rx: true,
      scoreType: 'Load',
      barbellLift: 'Deadlift',
      scoreRaw: 225,
    }),
    workout({ date: '2025-01-06', rx: true, description: '30 Wall Balls' }),
  ];
  const stats = computeStats(list);

  it('computes totals and rates', () => {
    expect(stats.total).toBe(4);
    expect(stats.prCount).toBe(1);
    expect(stats.rxRate).toBe(0.75);
    expect(stats.firstDate).toBe('2025-01-06');
    expect(stats.lastDate).toBe('2025-01-20');
    expect(stats.activeDays).toBe(4);
  });

  it('counts sessions per year', () => {
    expect(stats.years).toEqual([{ year: 2025, count: 4 }]);
    expect(stats.maxYearCount).toBe(4);
  });

  it('tracks the best load per barbell lift with attempt counts', () => {
    expect(stats.liftBests).toEqual([
      { lift: 'Deadlift', best: 275, date: '2025-01-13', attempts: 2 },
    ]);
  });

  it('keeps an earlier heavier lift as the best', () => {
    const s = computeStats([
      workout({ date: '2025-02-01', scoreType: 'Load', barbellLift: 'Snatch', scoreRaw: 135 }),
      workout({ date: '2025-01-01', scoreType: 'Load', barbellLift: 'Snatch', scoreRaw: 155 }),
    ]);
    expect(s.liftBests[0]).toMatchObject({ best: 155, date: '2025-01-01', attempts: 2 });
  });

  it('counts weekly streaks across consecutive calendar weeks', () => {
    // Three Mondays in a row, then a gap, then one more week
    const s = computeStats([
      workout({ date: '2025-03-10' }),
      workout({ date: '2025-02-10' }),
      workout({ date: '2025-01-20' }),
      workout({ date: '2025-01-15' }), // same week as the 13th
      workout({ date: '2025-01-13' }),
      workout({ date: '2025-01-06' }),
    ]);
    expect(s.longestStreakWeeks).toBe(3);
  });

  it('finds the busiest month', () => {
    expect(stats.busiestMonth).toEqual({ title: 'January 2025', count: 4 });
  });

  it('counts movement mentions in descriptions', () => {
    expect(stats.movementCounts).toContainEqual({ name: 'Wall Balls', count: 1 });
  });

  it('keeps never-programmed movements with a zero count', () => {
    const zero = stats.movementCounts.find((m) => m.name === 'Muscle-Ups');
    expect(zero).toEqual({ name: 'Muscle-Ups', count: 0 });
  });

  it('sorts movement counts most-frequent first', () => {
    const counts = stats.movementCounts.map((m) => m.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe('sessionsByMonth', () => {
  it('counts workouts per calendar month for one year only', () => {
    const counts = sessionsByMonth(
      [
        workout({ date: '2025-01-06' }),
        workout({ date: '2025-01-20' }),
        workout({ date: '2025-03-05' }),
        workout({ date: '2024-03-05' }), // other year, ignored
      ],
      2025,
    );
    expect(counts).toHaveLength(12);
    expect(counts[0]).toBe(2); // January
    expect(counts[2]).toBe(1); // March
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });
});
