import { liftNameFor, liftPages, parseRepScheme, percentTable } from '../lifts';
import type { Workout } from '../workouts';

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

function loadSet(load: number, success = true) {
  return { load, success };
}

describe('attribution', () => {
  it('merges a tagged session and a description-detected session onto the same page', () => {
    const list = [
      workout({ barbellLift: 'Back Squat', scoreType: 'Load', sets: [loadSet(225)] }),
      workout({ description: 'Back Squat 5x5', scoreType: 'Load', sets: [loadSet(235)] }),
    ];
    const pages = liftPages(list);
    expect(pages).toHaveLength(1);
    expect(pages[0].lift).toBe('Back Squats');
    expect(pages[0].sessions).toHaveLength(2);
  });

  it('a variant beats its parent: "Power Clean 3x3" lands on Power Cleans, not Cleans', () => {
    const list = [
      workout({ description: 'Power Clean 3x3', scoreType: 'Load', sets: [loadSet(185)] }),
    ];
    const pages = liftPages(list);
    expect(pages.map((p) => p.lift)).toEqual(['Power Cleans']);
  });

  it('nested variant: "Hang Power Clean" lands on Hang Cleans, not Power Cleans', () => {
    const list = [
      workout({ description: 'Hang Power Clean 3x2', scoreType: 'Load', sets: [loadSet(155)] }),
    ];
    expect(liftPages(list).map((p) => p.lift)).toEqual(['Hang Cleans']);
  });

  it('"Clean & Jerk" lands on Clean & Jerks, not Jerks or Cleans', () => {
    const list = [
      workout({ description: 'Clean & Jerk 1RM', scoreType: 'Load', sets: [loadSet(205)] }),
    ];
    expect(liftPages(list).map((p) => p.lift)).toEqual(['Clean & Jerks']);
  });

  it('a two-lift complex gets a single joined-name page, not separate pages', () => {
    const list = [
      workout({
        description: 'Power Clean + Push Jerk complex',
        scoreType: 'Load',
        sets: [loadSet(155)],
      }),
    ];
    const pages = liftPages(list);
    expect(pages).toHaveLength(1);
    expect(pages[0].lift).toBe('Power Cleans + Push Jerks');
  });

  it('produces no pages for non-Load workouts', () => {
    const list = [
      workout({ description: 'Back Squat 5x5', scoreType: 'Reps', sets: [loadSet(225)] }),
    ];
    expect(liftPages(list)).toHaveLength(0);
  });

  it('produces no pages for Load workouts with no detectable lift', () => {
    const list = [
      workout({ description: 'For time: 21-15-9', scoreType: 'Load', sets: [loadSet(100)] }),
    ];
    expect(liftPages(list)).toHaveLength(0);
  });

  it('falls back to the title when the description names no lift', () => {
    const list = [
      workout({
        description: '5 x 3 @ 75%',
        title: 'Monday Deadlift Day',
        scoreType: 'Load',
        sets: [loadSet(315)],
      }),
    ];
    expect(liftPages(list).map((p) => p.lift)).toEqual(['Deadlifts']);
  });
});

describe('parseRepScheme', () => {
  it.each([
    ['Back Squat 5x5', 5],
    ['3RM', 3],
    ['3 rep max', 3],
    ['1RM', 1],
    ['work to a heavy single', 1],
    ['heavy 3', 3],
    ['5 sets of 3', 3],
  ])('parses reps from %s', (text, reps) => {
    expect(parseRepScheme(text).reps).toBe(reps);
  });

  it('parses a full rep ladder', () => {
    expect(parseRepScheme('3-3-3-1-1-1')).toEqual({ reps: 1, ladder: [3, 3, 3, 1, 1, 1] });
  });

  it('rejects a load ladder (entries outside 1-15) as no scheme', () => {
    expect(parseRepScheme('185-205-225')).toEqual({ reps: null, ladder: null });
  });

  it('returns null for text with no recognizable scheme', () => {
    expect(parseRepScheme('For time: 21-15-9 thrusters and pull-ups')).toEqual({
      reps: null,
      ladder: null,
    });
  });

  describe('explicit rep mentions (highest priority)', () => {
    it('uniform per-set mentions collapse to a single reps value', () => {
      expect(parseRepScheme('1: 3 reps # 2: 3 reps')).toEqual({ reps: 3, ladder: null });
    });

    it('differing per-set mentions pair as a ladder, reps = min', () => {
      expect(parseRepScheme('1: 5 reps # 2: 3 reps # 3: 1 rep')).toEqual({
        reps: 1,
        ladder: [5, 3, 1],
      });
    });

    it('beats RM notation elsewhere in the text', () => {
      expect(parseRepScheme('5 reps @ 45% of 3RM')).toEqual({ reps: 5, ladder: null });
    });

    it('requires a leading digit — "Reps" alone falls through to null', () => {
      expect(parseRepScheme('Reps must be linked')).toEqual({ reps: null, ladder: null });
    });
  });
});

describe('e1RM via liftPages', () => {
  it('computes e1rm from a plain 5x5 scheme', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 5x5',
        scoreType: 'Load',
        sets: [loadSet(225)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.reps).toBe(5);
    expect(session.topLoad).toBe(225);
    expect(session.e1rm).toBe(263); // round(225 * (1 + 5/30))
  });

  it('a uniform scheme applies the same per-set reps to every logged set', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 5x5',
        scoreType: 'Load',
        sets: [loadSet(205), loadSet(215)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.sets.map((s) => s.reps)).toEqual([5, 5]);
  });

  it('an unparseable description leaves every set.reps null', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Grip strength day, no scheme noted',
        scoreType: 'Load',
        sets: [loadSet(225), loadSet(245)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.sets.map((s) => s.reps)).toEqual([null, null]);
  });

  it('a 1RM session produces e1rm === topLoad (a single IS the demonstrated max)', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 1RM',
        scoreType: 'Load',
        sets: [loadSet(300)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.reps).toBe(1);
    expect(session.topLoad).toBe(300);
    expect(session.e1rm).toBe(300); // not round(300 * 31/30) = 310 — no formula inflation
  });

  it('a matching rep ladder picks the best per-set estimate (the single wins)', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 3-3-3-1-1-1',
        scoreType: 'Load',
        sets: [loadSet(255), loadSet(265), loadSet(275), loadSet(285), loadSet(295), loadSet(305)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    // Per-set estimates: 281, 292, 303, 285, 295, 305 (singles count as-is) —
    // the trailing single wins.
    expect(session.e1rm).toBe(305);
    expect(session.reps).toBe(1);
    expect(session.sets.map((s) => s.reps)).toEqual([3, 3, 3, 1, 1, 1]);
  });

  it('a matching rep ladder picks the best per-set estimate (a triple wins)', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 3-3-3-1-1-1',
        scoreType: 'Load',
        sets: [loadSet(100), loadSet(110), loadSet(300), loadSet(315), loadSet(120), loadSet(130)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    // Per-set estimates: 110, 121, 330, 315, 124, 134 — the third-rung triple wins.
    expect(session.e1rm).toBe(330);
    expect(session.reps).toBe(3);
  });

  it('a plain "5-3-1" ladder pairs directly with 3 logged sets', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 5-3-1',
        scoreType: 'Load',
        sets: [loadSet(265), loadSet(285), loadSet(305)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.sets.map((s) => s.reps)).toEqual([5, 3, 1]);
  });

  it('pairs a SugarWOD-style rep-mentions ladder ("1: 5 reps # 2: 3 reps # 3: 1 rep") with logged sets', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat: 1: 5 reps # 2: 3 reps # 3: 1 rep',
        scoreType: 'Load',
        sets: [loadSet(300), loadSet(275), loadSet(265)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    // Per-set estimates: 350, 303, 274 — the first-rung set of 5 wins.
    expect(session.e1rm).toBe(350);
    expect(session.reps).toBe(5);
  });

  it('falls back to a topLoad-based estimate when the ladder length does not match logged sets', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 3-3-3-1-1-1',
        scoreType: 'Load',
        sets: [loadSet(200), loadSet(225), loadSet(245)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.reps).toBe(1); // min ladder entry
    expect(session.topLoad).toBe(245);
    expect(session.e1rm).toBe(245); // a single is the demonstrated max, no formula inflation
    // The ladder can't be attributed per set when its length doesn't match —
    // only the session-level reps (the min) is known, not each set's reps.
    expect(session.sets.map((s) => s.reps)).toEqual([null, null, null]);
  });

  it('an unparseable description still charts by topLoad with reps and e1rm null', () => {
    const list = [
      workout({
        barbellLift: 'Deadlift',
        description: 'Grip strength day, work up to something heavy',
        scoreType: 'Load',
        sets: [loadSet(315)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.reps).toBeNull();
    expect(session.e1rm).toBeNull();
    expect(session.topLoad).toBe(315);
  });

  it('caps Epley at 10 reps: a 12-rep set gets no e1rm estimate', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 3x12',
        scoreType: 'Load',
        sets: [loadSet(185)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.reps).toBe(12);
    expect(session.e1rm).toBeNull();
  });

  it('an all-miss session gets no e1rm even though reps parse', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        description: 'Back Squat 5x5',
        scoreType: 'Load',
        sets: [loadSet(225, false), loadSet(235, false)],
      }),
    ];
    const session = liftPages(list)[0].sessions[0];
    expect(session.reps).toBe(5);
    expect(session.e1rm).toBeNull();
    expect(session.topLoad).toBe(235); // falls back to the best of the failed loads
  });
});

describe('window math', () => {
  const TODAY = '2026-07-10';

  it('allTimeMax comes from an older heavier session; currentMax only from the trailing 6 months', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        date: '2025-11-01',
        scoreType: 'Load',
        sets: [loadSet(300)],
      }),
      workout({
        barbellLift: 'Back Squat',
        date: '2026-05-01',
        scoreType: 'Load',
        sets: [loadSet(275)],
      }),
    ];
    const page = liftPages(list, TODAY)[0];
    expect(page.allTimeMax).toBe(300);
    expect(page.allTimeMaxDate).toBe('2025-11-01');
    expect(page.currentMax).toBe(275);
  });

  it('keeps the earlier date when the all-time max is tied', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        date: '2025-11-01',
        scoreType: 'Load',
        sets: [loadSet(300)],
      }),
      workout({
        barbellLift: 'Back Squat',
        date: '2026-05-01',
        scoreType: 'Load',
        sets: [loadSet(300)],
      }),
    ];
    const page = liftPages(list, TODAY)[0];
    expect(page.allTimeMax).toBe(300);
    expect(page.allTimeMaxDate).toBe('2025-11-01');
  });

  it('currentMax is 0 when every session falls outside the trailing 6 months', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        date: '2025-06-01',
        scoreType: 'Load',
        sets: [loadSet(300)],
      }),
    ];
    const page = liftPages(list, TODAY)[0];
    expect(page.currentMax).toBe(0);
    expect(page.allTimeMax).toBe(300);
  });

  it('computes the cutoff with UTC calendar math (no DST drift off local time)', () => {
    // A January "today" puts the 6-month cutoff across a DST boundary in most
    // US/EU timezones — local-time Date mutation lands on the 9th, not the 10th.
    const session = (date: string, load: number) =>
      workout({ barbellLift: 'Back Squat', date, scoreType: 'Load', sets: [loadSet(load)] });
    const page = liftPages(
      [session('2025-07-09', 400), session('2025-07-10', 300), session('2026-01-05', 200)],
      '2026-01-10',
    )[0];
    // Exactly on the cutoff counts; one day before it does not.
    expect(page.currentMax).toBe(300);
    expect(page.allTimeMax).toBe(400);
  });
});

describe('misses', () => {
  it('counts a failed set as a miss and excludes it from topLoad and the maxes', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        date: '2026-06-01',
        scoreType: 'Load',
        sets: [loadSet(225), loadSet(245, false)],
      }),
    ];
    const page = liftPages(list, '2026-07-10')[0];
    expect(page.sessions[0].topLoad).toBe(225);
    expect(page.missCount).toBe(1);
    expect(page.allTimeMax).toBe(225);
    expect(page.currentMax).toBe(225);
  });

  it('a session with only failed sets contributes 0 to the maxes but keeps the failed load as topLoad', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        date: '2026-06-01',
        scoreType: 'Load',
        sets: [loadSet(275, false)],
      }),
    ];
    const page = liftPages(list, '2026-07-10')[0];
    expect(page.sessions[0].topLoad).toBe(275);
    expect(page.missCount).toBe(1);
    expect(page.allTimeMax).toBe(0);
    expect(page.currentMax).toBe(0);
  });
});

describe('scoreRaw fallback', () => {
  it('treats an empty sets array with a scoreRaw as one implicit successful set', () => {
    const list = [
      workout({ barbellLift: 'Back Squat', scoreType: 'Load', sets: [], scoreRaw: 185 }),
    ];
    const page = liftPages(list)[0];
    expect(page.sessions).toHaveLength(1);
    expect(page.sessions[0].sets).toEqual([{ load: 185, success: true, reps: null }]);
    expect(page.sessions[0].topLoad).toBe(185);
  });
});

describe('sorting', () => {
  it('sorts pages by allTimeMax descending', () => {
    const list = [
      workout({ barbellLift: 'Back Squat', scoreType: 'Load', sets: [loadSet(225)] }),
      workout({ barbellLift: 'Deadlift', scoreType: 'Load', sets: [loadSet(315)] }),
      workout({ barbellLift: 'Push Press', scoreType: 'Load', sets: [loadSet(135)] }),
    ];
    const pages = liftPages(list);
    expect(pages.map((p) => p.lift)).toEqual(['Deadlifts', 'Back Squats', 'Push Press']);
  });

  it('sorts sessions within a page oldest-first regardless of input order', () => {
    const list = [
      workout({
        barbellLift: 'Back Squat',
        date: '2026-03-01',
        scoreType: 'Load',
        sets: [loadSet(225)],
      }),
      workout({
        barbellLift: 'Back Squat',
        date: '2026-01-01',
        scoreType: 'Load',
        sets: [loadSet(215)],
      }),
      workout({
        barbellLift: 'Back Squat',
        date: '2026-02-01',
        scoreType: 'Load',
        sets: [loadSet(220)],
      }),
    ];
    const page = liftPages(list)[0];
    expect(page.sessions.map((s) => s.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });
});

describe('percentTable', () => {
  it('builds 10 rows from 95% to 50% in steps of 5, rounded to the nearest 5 lb', () => {
    const rows = percentTable(315);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toEqual({ pct: 95, load: 300 }); // 315*.95=299.25 -> round(59.85)*5=300
    expect(rows[rows.length - 1]).toEqual({ pct: 50, load: 160 }); // 315*.50=157.5 -> round(31.5)*5=160
    expect(rows.map((r) => r.pct)).toEqual([95, 90, 85, 80, 75, 70, 65, 60, 55, 50]);
    for (const row of rows) expect(row.load % 5).toBe(0);
  });
});

describe('liftNameFor', () => {
  it('returns null for workouts with no tag and no detectable lift', () => {
    expect(liftNameFor(workout({ description: 'For time: 21-15-9' }))).toBeNull();
  });
});
