import previewWorkouts from '../../data/preview-workouts.json';
import { detectMovements, DISPLAY_MOVEMENTS, MOVEMENT_DEFS } from '../movements';
import { Workout } from '../workouts';

const preview = previewWorkouts as Workout[];

function detect(description: string, amrapRounds?: number | null) {
  return detectMovements(description, { amrapRounds });
}

function reps(description: string, name: string, amrapRounds?: number | null) {
  const hit = detect(description, amrapRounds).find((d) => d.def.name === name);
  if (!hit) throw new Error(`${name} not detected in: ${description}`);
  return hit.reps;
}

function names(description: string) {
  return detect(description).map((d) => d.def.name);
}

describe('MOVEMENT_DEFS', () => {
  test('display names are unique', () => {
    const all = MOVEMENT_DEFS.map((d) => d.name);
    expect(new Set(all).size).toBe(all.length);
  });

  test('every variantOf points at an existing display movement', () => {
    const displayNames = new Set(DISPLAY_MOVEMENTS.map((d) => d.name));
    for (const def of MOVEMENT_DEFS) {
      if (def.variantOf) expect(displayNames.has(def.variantOf)).toBe(true);
    }
  });

  test('variants are excluded from the display list', () => {
    expect(DISPLAY_MOVEMENTS.every((d) => !d.variantOf)).toBe(true);
  });
});

describe('detectMovements — detection', () => {
  test('finds movements across lines with aliases', () => {
    const desc = 'FOR TIME:\n5 Rounds:\n13 Burpees\n12 T2B\n7 Overhead Squats 95#/65#';
    expect(names(desc)).toEqual(
      expect.arrayContaining(['Burpees', 'Toes-to-Bar', 'Overhead Squats']),
    );
  });

  test('barbell variants detect alongside their parent', () => {
    const found = names('EVERY 90 SEC x 7 Sets\n1 Power Clean 135#');
    expect(found).toEqual(expect.arrayContaining(['Cleans', 'Power Cleans']));
  });

  test('"clean up" chatter does not count as Cleans', () => {
    expect(names('3 Rounds\n10 Burpees\nClean up your station after')).not.toContain('Cleans');
  });

  test('"squat clean" is Cleans, not Front Squats', () => {
    const found = names('21-15-9\nSquat Cleans 115#\nRing Dips');
    expect(found).toContain('Cleans');
    expect(found).toContain('Squat Cleans');
    expect(found).not.toContain('Front Squats');
  });

  test('sumo deadlift high pull is SDHP, not Sumo Deadlifts', () => {
    const found = names('3 Rounds\n15 Sumo Deadlift High Pulls 75#');
    expect(found).toContain('SDHP');
    expect(found).not.toContain('Sumo Deadlifts');
  });
});

describe('detectMovements — rep estimation', () => {
  test('rep ladder applies its sum to movements on and after the ladder line', () => {
    const desc = 'FOR TIME\n21-15-9\nThrusters 95#\nPull-Ups';
    expect(reps(desc, 'Thrusters')).toBe(45);
    expect(reps(desc, 'Pull-Ups')).toBe(45);
  });

  test('ladder inline with the movement gets the sum, not the last rung', () => {
    expect(reps('21-15-9 Wall Balls 20#', 'Wall Balls')).toBe(45);
  });

  test('rounds multiply per-line counts', () => {
    const desc = 'FOR TIME:\n5 Rounds:\n13 Burpees\n12 Toes-to-Bar\n7 Overhead Squats 95#/65#';
    expect(reps(desc, 'Burpees')).toBe(65);
    expect(reps(desc, 'Toes-to-Bar')).toBe(60);
    expect(reps(desc, 'Overhead Squats')).toBe(35);
  });

  test('"x N sets" works as a rounds multiplier', () => {
    expect(reps('EVERY 90 SEC x 7 Sets\n1 Power Clean 135#', 'Power Cleans')).toBe(7);
  });

  test('EMOM slots repeat minutes / slot-lines times', () => {
    const desc =
      '12:00 EMOM\nMinute 1: 13 Cal Row\nMinute 2: 11 Push Press 75#/55#\nMinute 3: 7 HSPU\nMinute 4: Rest';
    expect(reps(desc, 'Rowing')).toBe(39);
    expect(reps(desc, 'Push Press')).toBe(33);
    expect(reps(desc, 'HSPU')).toBe(21);
  });

  test('EMOM without slot lines yields null (repeat count unknown)', () => {
    expect(reps('EMOM 10\n5 Power Cleans 135#', 'Power Cleans')).toBeNull();
  });

  test('AMRAP is null without a rounds count, computed with one', () => {
    const cindy = '20:00 AMRAP\n5 Pull-Ups\n10 Push-Ups\n15 Air Squats';
    expect(reps(cindy, 'Pull-Ups')).toBeNull();
    expect(reps(cindy, 'Pull-Ups', 17)).toBe(85);
    expect(reps(cindy, 'Air Squats', 17)).toBe(255);
  });

  test('plain counted line with no scheme', () => {
    expect(reps('FOR TIME\n100 Double Unders\n50 Sit-Ups', 'Double Unders')).toBe(100);
    expect(reps('FOR TIME\n100 Double Unders\n50 Sit-Ups', 'Sit-Ups')).toBe(50);
  });

  test('"13 Cal Row" reads the calorie count', () => {
    expect(reps('3 Rounds\n13 Cal Row\n10 Burpees', 'Rowing')).toBe(39);
  });

  test('distance-based lines yield null, not meters-as-reps', () => {
    expect(reps('3 Rounds\n400m Run\n21 KB Swings 53#', 'Running')).toBeNull();
    expect(reps('3 Rounds\n400m Run\n21 KB Swings 53#', 'KB Swings')).toBe(63);
  });

  test('any unparseable occurrence poisons the total to null', () => {
    const desc = 'FOR TIME\n50 Burpees\nThen max Burpees in 2:00';
    expect(reps(desc, 'Burpees')).toBeNull();
  });
});

describe('parity with the legacy MOVEMENTS list', () => {
  // The exact [name, pattern] pairs that shipped in workouts.ts before the
  // taxonomy. Counts over the committed preview dataset must not change when
  // patterns are refined (e.g. the Cleans "clean up" guard).
  const LEGACY: [string, RegExp][] = [
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

  test('preview dataset is non-trivial', () => {
    expect(preview.length).toBeGreaterThan(100);
  });

  test.each(LEGACY)('%s counts match on the preview dataset', (name, legacyPattern) => {
    const def = MOVEMENT_DEFS.find((d) => d.name === name);
    expect(def).toBeDefined();
    const legacyCount = preview.filter((w) => legacyPattern.test(w.description)).length;
    const newCount = preview.filter((w) => def!.pattern.test(w.description)).length;
    expect(newCount).toBe(legacyCount);
  });
});
