import { File, Paths } from 'expo-file-system';
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { parseSugarwodCsv } from '@/lib/parse-sugarwod';
import {
  buildWorkoutsByDate,
  computeStats,
  MonthSection,
  Stats,
  Workout,
  groupByMonth,
} from '@/lib/workouts';

// Bundled at build time by scripts/convert-workouts.ts — Chris's history in
// dev ("test mode"), or the committed sample data on fresh clones/CI.
const bundledWorkouts = require('@/data/workouts.json') as Workout[];

export type DataSource = 'bundled' | 'imported';

interface ImportResult {
  ok: boolean;
  /** Number of workouts imported (when ok). */
  count?: number;
  /** Error message (when not ok). */
  error?: string;
  canceled?: boolean;
}

interface WorkoutsContextValue {
  workouts: Workout[];
  workoutById: Map<string, Workout>;
  workoutsByDate: Map<string, Workout[]>;
  monthSections: MonthSection[];
  stats: Stats;
  source: DataSource;
  importedCount: number | null;
  /** Opens the system file picker and imports a SugarWOD CSV export. */
  importCsv(): Promise<ImportResult>;
  /** Switches back to the bundled dataset (test mode). */
  useBundled(): void;
  /** Switches to the previously imported dataset, if one exists on device. */
  useImported(): void;
}

const WorkoutsContext = createContext<WorkoutsContextValue | null>(null);

const importedDataFile = () => new File(Paths.document, 'imported-workouts.json');
const sourcePrefFile = () => new File(Paths.document, 'data-source.json');

function readImportedWorkouts(): Workout[] | null {
  try {
    const file = importedDataFile();
    if (!file.exists) return null;
    const parsed = JSON.parse(file.textSync()) as Workout[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function readSourcePref(): DataSource {
  try {
    const file = sourcePrefFile();
    if (!file.exists) return 'bundled';
    return (JSON.parse(file.textSync()).source as DataSource) ?? 'bundled';
  } catch {
    return 'bundled';
  }
}

function writeSourcePref(source: DataSource) {
  try {
    sourcePrefFile().write(JSON.stringify({ source }));
  } catch {
    // Preference persistence is best-effort; the session state is already set.
  }
}

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const [imported, setImported] = useState<Workout[] | null>(readImportedWorkouts);
  const [savedSource, setSource] = useState<DataSource>(readSourcePref);
  // The saved preference can point at an import that no longer exists on disk.
  const source: DataSource = savedSource === 'imported' && imported ? 'imported' : 'bundled';

  const importCsv = useCallback(async (): Promise<ImportResult> => {
    try {
      const picked = await File.pickFileAsync({
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'text/plain'],
      });
      if (picked.canceled) return { ok: false, canceled: true };
      const csv = await picked.result.text();
      const parsed = parseSugarwodCsv(csv);
      if (parsed.length === 0) return { ok: false, error: 'No workouts found in that file.' };
      importedDataFile().write(JSON.stringify(parsed));
      setImported(parsed);
      setSource('imported');
      writeSourcePref('imported');
      return { ok: true, count: parsed.length };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Import failed.' };
    }
  }, []);

  const useBundled = useCallback(() => {
    setSource('bundled');
    writeSourcePref('bundled');
  }, []);

  const useImported = useCallback(() => {
    setSource('imported');
    writeSourcePref('imported');
  }, []);

  const workouts = source === 'imported' && imported ? imported : bundledWorkouts;

  const value = useMemo<WorkoutsContextValue>(
    () => ({
      workouts,
      workoutById: new Map(workouts.map((w) => [w.id, w])),
      workoutsByDate: buildWorkoutsByDate(workouts),
      monthSections: groupByMonth(workouts),
      stats: computeStats(workouts),
      source,
      importedCount: imported?.length ?? null,
      importCsv,
      useBundled,
      useImported,
    }),
    [workouts, source, imported, importCsv, useBundled, useImported],
  );

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
}

export function useWorkouts(): WorkoutsContextValue {
  const value = useContext(WorkoutsContext);
  if (!value) throw new Error('useWorkouts must be used within WorkoutsProvider');
  return value;
}
