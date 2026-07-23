// Routes a picked CSV to the right per-app parser by trying each format's
// header check. When no format matches, the SugarWOD WrongFileError is the one
// surfaced to the import flow (SugarWOD is the primary source; the import
// screens name both services and translate the error accordingly).

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
