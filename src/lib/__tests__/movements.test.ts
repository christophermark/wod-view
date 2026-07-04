import previewWorkouts from '../../data/preview-workouts.json';
import { detectionText, detectMovements, DISPLAY_MOVEMENTS, MOVEMENT_DEFS } from '../movements';
import { computeStats, Workout } from '../workouts';

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

describe('detectMovements — expanded spellings (July 2026 coverage sweep)', () => {
  // Every alias here was found in real SugarWOD programming text and missed
  // by the original patterns. Cases are synthetic recreations, not archive
  // content.
  const CASES: [description: string, expected: string][] = [
    ['21 Wall-ball shots 20#', 'Wall Balls'],
    ['50 Double-Unders', 'Double Unders'],
    ['100 Dubs', 'Double Unders'],
    ['3 Wall Climbs', 'Wall Walks'],
    ['5 Wall Climb', 'Wall Walks'],
    ['10 Toe to Bar', 'Toes-to-Bar'],
    ['12 TTB', 'Toes-to-Bar'],
    ['15 KB DL 53#', 'Deadlifts'],
    ['10 DLs 185#', 'Deadlifts'],
    ['20 American Swings 53#', 'KB Swings'],
    ['20 Freedom Swings 53#', 'KB Swings'],
    ['30 Plate Twists 25#', 'Russian Twists'],
    ['15 KB Sumo DLHPs 35#', 'SDHP'],
    ['12 Sumo DL High Pulls 75#', 'SDHP'],
    ['4 x 200m Shuttle Runs', 'Running'],
    ['12 Goblet Squats 53#', 'Goblet Squats'],
    ['10 Renegade Rows 35#', 'Renegade Rows'],
    ['12 DB Rows 50#', 'Dumbbell Rows'],
    ['10 Bent-Over Rows 95#', 'Dumbbell Rows'],
    ['15 Plate Ground-to-Overhead 45#', 'Ground-to-Overhead'],
    ['20 Plate G2OH 45#', 'Ground-to-Overhead'],
    ['10 Shoulder-to-Overhead 115#', 'Shoulder-to-Overhead'],
    ['12 S2OH 95#', 'Shoulder-to-Overhead'],
    ['10 Medicine-Ball Box Step-Overs', 'Box Step-Overs'],
    ['20 Box Step Overs 24"', 'Box Step-Overs'],
    ['30 Flutter Kicks', 'Flutter Kicks'],
    [':30 Arch Hold', 'Arch Holds'],
    ['Accumulate 1:00 Handstand Hold', 'Handstand Holds'],
    ['3 Bar Muscle-Ups', 'Bar Muscle-Ups'],
    ['2 Ring Muscle-Ups', 'Ring Muscle-Ups'],
  ];

  test.each(CASES)('%s → %s', (description, expected) => {
    expect(names(description)).toContain(expected);
  });

  test('bar/ring muscle-up variants still roll up to Muscle-Ups', () => {
    expect(names('3 Bar Muscle-Ups')).toContain('Muscle-Ups');
    expect(names('2 Ring Muscle-Ups')).toContain('Muscle-Ups');
  });

  test('DLHP does not trigger the DL deadlift abbreviation', () => {
    expect(names('15 DLHPs 45#')).not.toContain('Deadlifts');
  });

  test('"rows" the strength movement does not count as erg Rowing', () => {
    expect(names('10 Renegade Rows 35#')).not.toContain('Rowing');
    expect(names('12 DB Rows 50#')).not.toContain('Rowing');
  });

  test('plain running vocabulary still detects', () => {
    expect(names('800m Run')).toContain('Running');
    expect(names('Runs do not count toward score\n400m Run')).toContain('Running');
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

  test('sets×reps scheme after the movement is the complete total', () => {
    expect(reps('Back Squat 5x5 @ 70%', 'Back Squats')).toBe(25);
    expect(reps('Bench Press 3 x 10', 'Bench Press')).toBe(30);
  });

  test('sets×reps scheme before the movement is the complete total', () => {
    expect(reps('5x3 Power Cleans 155#', 'Power Cleans')).toBe(15);
  });

  test('sets×reps is not multiplied by a rounds context', () => {
    expect(reps('Strength in 4 sets\nBack Squat 5x5', 'Back Squats')).toBe(25);
  });

  test('"log load lifted in last 3 sets" is not a rounds multiplier', () => {
    const desc = 'Strength\n10 Deadlifts 225#\nLog load lifted in last 3 sets';
    expect(reps(desc, 'Deadlifts')).toBe(10);
  });

  test('a header line naming the movement without a count poisons reps to null', () => {
    const desc = 'Deadlift Day\n10 Deadlifts 225#';
    expect(reps(desc, 'Deadlifts')).toBeNull();
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

describe('detectionText — title fallback for strength days', () => {
  const percentDay = '6 Rounds @ 2:00\n5 reps @ 45% of 3RM\n5 reps @ 55% of 3RM';

  test('appends the title when the description names no movement', () => {
    const text = detectionText({ description: percentDay, title: 'Front Squat Week 3' });
    expect(names(text)).toContain('Front Squats');
  });

  test('ignores the title when the description already names a movement', () => {
    const text = detectionText({ description: '10 Burpees', title: 'Back Squat Bonus' });
    expect(names(text)).toEqual(['Burpees']);
  });

  test('title-detected movements get null reps (percentage schemes are unparseable)', () => {
    const text = detectionText({ description: percentDay, title: 'Front Squat Week 3' });
    expect(reps(text, 'Front Squats')).toBeNull();
  });

  test('computeStats movementCounts includes title-fallback workouts', () => {
    const workout: Workout = {
      id: 'w1',
      date: '2026-01-05',
      title: 'Front Squat Week 3',
      description: percentDay,
      score: '185',
      scoreRaw: 185,
      scoreType: 'Load',
      barbellLift: '',
      sets: [],
      notes: '',
      rx: true,
      pr: false,
    };
    const counts = computeStats([workout]).movementCounts;
    expect(counts.find((m) => m.name === 'Front Squats')?.count).toBe(1);
  });
});

describe('parity with the legacy MOVEMENTS list', () => {
  // The exact [name, pattern] pairs that shipped in workouts.ts before the
  // taxonomy. Patterns may widen (new spellings raise counts), but every
  // workout the legacy regex matched must still match — losing detections
  // is a regression.
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

  test.each(LEGACY)(
    '%s never loses a legacy match on the preview dataset',
    (name, legacyPattern) => {
      const def = MOVEMENT_DEFS.find((d) => d.name === name);
      expect(def).toBeDefined();
      const lost = preview.filter(
        (w) => legacyPattern.test(w.description) && !def!.pattern.test(w.description),
      );
      expect(lost.map((w) => w.id)).toEqual([]);
    },
  );
});
