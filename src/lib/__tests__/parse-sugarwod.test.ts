import { parseCsv, parseSugarwodCsv, restoreLineBreaks } from '../parse-sugarwod';

describe('parseCsv', () => {
  it('parses quoted fields containing commas and escaped quotes', () => {
    const rows = parseCsv('a,"b, c","say ""hi"""\n1,2,3\n');
    expect(rows).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });

  it('handles CRLF line endings and skips trailing blank lines', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('restoreLineBreaks', () => {
  // SugarWOD strips newlines on export; these are real glue patterns from exports.
  it.each([
    [
      'FOR TIME:30-20-10Back Squats 75#/55#Pull-UpsDirectly into...',
      'FOR TIME:\n30-20-10\nBack Squats 75#/55#\nPull-Ups\nDirectly into...',
    ],
    [
      '30 Wall Balls 20#/14#30 KB Swings 53#/35#*20:00 TIME CAP.',
      '30 Wall Balls 20#/14#\n30 KB Swings 53#/35#\n*20:00 TIME CAP.',
    ],
    ['15:00 AMR40 Walking Lunges', '15:00 AMR\n40 Walking Lunges'],
    ['21 Toes-2-Bar400m Run', '21 Toes-2-Bar\n400m Run'],
    [
      '1 Wall Climb (Rx+ Rope Climb)2 Power Cleans',
      '1 Wall Climb (Rx+ Rope Climb)\n2 Power Cleans',
    ],
    ['Push-Ups (Rx+ HSPU)After Round 3, Run 800m', 'Push-Ups (Rx+ HSPU)\nAfter Round 3, Run 800m'],
    ['26 DB Rows  40 Double Unders', '26 DB Rows\n40 Double Unders'],
  ])('splits %j', (input, expected) => {
    expect(restoreLineBreaks(input)).toBe(expected);
  });

  it.each([
    '5x5 Back Squat',
    'Build to a 1RM',
    '12:00 AMRAP',
    'T2B and C2B work',
    'log results to SugarWod.',
    'WOD by McGregor',
  ])('leaves %j intact', (input) => {
    expect(restoreLineBreaks(input)).toBe(input);
  });

  it('returns empty string for empty input', () => {
    expect(restoreLineBreaks('')).toBe('');
  });
});

const HEADER =
  'date,title,description,best_result_raw,best_result_display,score_type,barbell_lift,set_details,notes,rx_or_scaled,pr';

describe('parseSugarwodCsv', () => {
  const csv = [
    HEADER,
    '09/28/2021,"Warm-up","Row 500m",2,"2","Emoji Selection","","[{""index"":2}]","",RX,',
    '10/04/2021,"Monday","15:00 AMRAP",359,"359","Reps","","[{""reps"":359}]","Tough one",SCALED,',
    '01/10/2025,"Back Squat Day","Build to 1RM",225,"225","Load","Back Squat","[{""load"":225,""success"":true}]","",RX,PR',
  ].join('\n');

  it('maps rows to workouts, newest first', () => {
    const workouts = parseSugarwodCsv(csv);
    expect(workouts.map((w) => w.date)).toEqual(['2025-01-10', '2021-10-04', '2021-09-28']);

    const squat = workouts[0];
    expect(squat.title).toBe('Back Squat Day');
    expect(squat.score).toBe('225');
    expect(squat.scoreRaw).toBe(225);
    expect(squat.scoreType).toBe('Load');
    expect(squat.barbellLift).toBe('Back Squat');
    expect(squat.sets).toEqual([{ load: 225, success: true }]);
    expect(squat.rx).toBe(true);
    expect(squat.pr).toBe(true);

    const amrap = workouts[1];
    expect(amrap.rx).toBe(false);
    expect(amrap.pr).toBe(false);
    expect(amrap.notes).toBe('Tough one');
  });

  it('assigns unique ids', () => {
    const workouts = parseSugarwodCsv(csv);
    expect(new Set(workouts.map((w) => w.id)).size).toBe(workouts.length);
  });

  it('tolerates malformed set_details', () => {
    const bad = [HEADER, '09/28/2021,"X","desc",1,"1","Reps","","not json","",RX,'].join('\n');
    expect(parseSugarwodCsv(bad)[0].sets).toEqual([]);
  });

  it('rejects files that are not SugarWOD exports', () => {
    expect(() => parseSugarwodCsv('foo,bar\n1,2\n')).toThrow(/missing columns/);
    expect(() => parseSugarwodCsv('')).toThrow();
  });
});
