// Routes a picked CSV to the right per-app parser by trying each format's
// header check. The UI stays SugarWOD-branded — Chalk It Pro support is
// intentionally silent — so when no format matches, the SugarWOD-flavored
// WrongFileError is the one surfaced to the import flow.

import { Workout } from './workouts';
import { WrongFileError, parseSugarwodCsv } from './parse-sugarwod';
import { parseChalkItProCsv } from './parse-chalkitpro';

/** Parses a workout CSV export from any supported app (SugarWOD, Chalk It Pro). */
export function parseWorkoutsCsv(csv: string): Workout[] {
  try {
    return parseSugarwodCsv(csv);
  } catch (sugarwodError) {
    if (!(sugarwodError instanceof WrongFileError)) throw sugarwodError;
    try {
      return parseChalkItProCsv(csv);
    } catch (chalkError) {
      if (chalkError instanceof WrongFileError) throw sugarwodError;
      throw chalkError;
    }
  }
}
