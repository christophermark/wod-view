import { chalkScoreRaw, parseChalkItProCsv } from '../parse-chalkitpro';
import { WrongFileError } from '../parse-sugarwod';
import { parseWorkoutsCsv } from '../parse-workouts-csv';

// All fixture rows are synthetic — never copy rows from a personal export.
const HEADER = 'Title,Date,Style,RepMax,PrimaryMovement,BestScore,Notes';

describe('chalkScoreRaw', () => {
  it.each([
    ['14:46', 886], // time → total seconds, matching SugarWOD raw values
    ['1:02:03', 3723],
    ['13+4', 13.0004], // rounds+reps → rounds + reps/10000
    ['359', 359],
    ['48.25', 48.25],
    ['225', 225],
  ])('parses %j as %d', (input, expected) => {
    expect(chalkScoreRaw(input)).toBe(expected);
  });

  it.each(['Yes', 'No', '??', '?', ''])('returns null for text score %j', (input) => {
    expect(chalkScoreRaw(input)).toBeNull();
  });
});

describe('parseChalkItProCsv', () => {
  const csv = [
    HEADER,
    'Monday - 3.4.2024,3/4/2024,Reps,,,212,20# ball',
    'Deadlift 5x3,3/6/2024,Load,3,Deadlift,265,',
    'Friday - 3.8.2024,3/8/2024,Freeform,,,17:12,"65# bar scaled the pull-ups"',
    'Tuesday - 3.12.2024,3/12/2024,Rounds,,,9+15,',
    'Row Intervals,3/14/2024,Calories,,,187,',
    'Saturday - 3.16.2024,3/16/2024,Time,,,23:40,Partner WOD',
  ].join('\n');

  it('parses rows and sorts newest-first', () => {
    const workouts = parseChalkItProCsv(csv);
    expect(workouts.map((w) => w.date)).toEqual([
      '2024-03-16',
      '2024-03-14',
      '2024-03-12',
      '2024-03-08',
      '2024-03-06',
      '2024-03-04',
    ]);
  });

  it('zero-pads M/D/YYYY dates into ISO', () => {
    const [newest] = parseChalkItProCsv(csv);
    expect(newest.date).toBe('2024-03-16');
  });

  it('maps Styles onto the SugarWOD scoreType vocabulary', () => {
    const byTitle = new Map(parseChalkItProCsv(csv).map((w) => [w.title, w]));
    expect(byTitle.get('Monday - 3.4.2024')?.scoreType).toBe('Reps');
    expect(byTitle.get('Deadlift 5x3')?.scoreType).toBe('Load');
    expect(byTitle.get('Tuesday - 3.12.2024')?.scoreType).toBe('Rounds + Reps');
    expect(byTitle.get('Row Intervals')?.scoreType).toBe('Calories');
    // Time and Freeform both map to '' so the app infers "Time" from mm:ss
    expect(byTitle.get('Saturday - 3.16.2024')?.scoreType).toBe('');
    expect(byTitle.get('Friday - 3.8.2024')?.scoreType).toBe('');
  });

  it('derives scoreRaw from the display score', () => {
    const byTitle = new Map(parseChalkItProCsv(csv).map((w) => [w.title, w]));
    expect(byTitle.get('Friday - 3.8.2024')?.scoreRaw).toBe(17 * 60 + 12);
    expect(byTitle.get('Tuesday - 3.12.2024')?.scoreRaw).toBe(9.0015);
    expect(byTitle.get('Deadlift 5x3')?.scoreRaw).toBe(265);
  });

  it('exposes rep-max lifts through barbellLift so lift PRs work', () => {
    const lift = parseChalkItProCsv(csv).find((w) => w.title === 'Deadlift 5x3')!;
    expect(lift.barbellLift).toBe('Deadlift');
    expect(lift.scoreType).toBe('Load');
    expect(lift.scoreRaw).toBe(265);
  });

  it('fills fields the export does not carry with safe defaults', () => {
    for (const w of parseChalkItProCsv(csv)) {
      expect(w.description).toBe('');
      expect(w.sets).toEqual([]);
      expect(w.rx).toBe(false);
      expect(w.pr).toBe(false);
    }
  });

  it('restores flattened line breaks in notes', () => {
    const csvWithGluedNote = [
      HEADER,
      'Monday,6/2/2025,Reps,,,100,"135# bar regular pushupsOtherwise Rx"',
    ].join('\n');
    const [w] = parseChalkItProCsv(csvWithGluedNote);
    expect(w.notes).toBe('135# bar regular pushups\nOtherwise Rx');
  });

  it('throws WrongFileError for a non-Chalk header', () => {
    expect(() => parseChalkItProCsv('date,title,description\n1/1/2024,x,y')).toThrow(
      WrongFileError,
    );
    expect(() => parseChalkItProCsv('')).toThrow(WrongFileError);
  });

  it('throws a per-row error for unparseable dates', () => {
    const bad = [HEADER, 'Monday,not-a-date,Reps,,,100,'].join('\n');
    expect(() => parseChalkItProCsv(bad)).toThrow('Row 2: unparseable date "not-a-date"');
  });
});

describe('parseWorkoutsCsv', () => {
  const SUGARWOD_HEADER =
    'date,title,description,best_result_raw,best_result_display,score_type,barbell_lift,set_details,notes,rx_or_scaled,pr';

  it('routes SugarWOD exports to the SugarWOD parser', () => {
    const csv = [
      SUGARWOD_HEADER,
      '10/04/2021,"Monday","15:00 AMRAP",359,"359","Reps","","[{""reps"":359}]","",SCALED,',
    ].join('\n');
    const [w] = parseWorkoutsCsv(csv);
    expect(w.title).toBe('Monday');
    expect(w.description).toBe('15:00 AMRAP');
    expect(w.scoreRaw).toBe(359);
  });

  it('routes Chalk It Pro exports to the Chalk parser', () => {
    const csv = [HEADER, 'Friday - 3.8.2024,3/8/2024,Freeform,,,17:12,'].join('\n');
    const [w] = parseWorkoutsCsv(csv);
    expect(w.title).toBe('Friday - 3.8.2024');
    expect(w.scoreRaw).toBe(17 * 60 + 12);
  });

  it('surfaces the SugarWOD-flavored error when no format matches', () => {
    // The UI only ever mentions SugarWOD, so unknown files must fail with
    // the SugarWOD wrong-file message, not a Chalk It Pro one.
    expect(() => parseWorkoutsCsv('a,b,c\n1,2,3')).toThrow(/SugarWOD/);
    expect(() => parseWorkoutsCsv('a,b,c\n1,2,3')).toThrow(WrongFileError);
  });

  it('propagates row-level errors from the matched parser', () => {
    const bad = [HEADER, 'Monday,not-a-date,Reps,,,100,'].join('\n');
    expect(() => parseWorkoutsCsv(bad)).toThrow('Row 2: unparseable date "not-a-date"');
  });
});
