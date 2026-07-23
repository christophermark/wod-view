// End-to-end tests for the in-app CSV import flow: the real WorkoutsProvider
// and parser run against real files read from disk (the committed synthetic
// sample as the happy path, plus wrong-file fixtures). Only expo-file-system
// is faked, with an in-memory store standing in for the document directory
// and the system file picker.

import { act, renderHook } from '@testing-library/react-native';
import fs from 'node:fs';
import path from 'node:path';
import { ReactNode } from 'react';

import { useWorkouts, WorkoutsProvider } from '../data-context';

jest.mock('expo-file-system', () => {
  const store = new Map<string, string>();
  class File {
    uri: string;
    constructor(...segments: string[]) {
      this.uri = segments.join('/');
    }
    get exists() {
      return store.has(this.uri);
    }
    textSync() {
      const content = store.get(this.uri);
      if (content == null) throw new Error(`ENOENT: ${this.uri}`);
      return content;
    }
    write(content: string) {
      store.set(this.uri, content);
    }
    delete() {
      if (!store.delete(this.uri)) throw new Error(`ENOENT: ${this.uri}`);
    }
    static pickFileAsync = jest.fn();
  }
  return { File, Paths: { document: 'file:///documents' }, __store: store };
});

const { File: MockFile, __store: store } = jest.requireMock('expo-file-system') as {
  File: { pickFileAsync: jest.Mock };
  __store: Map<string, string>;
};

const IMPORTED_URI = 'file:///documents/imported-workouts.json';
const SOURCE_PREF_URI = 'file:///documents/data-source.json';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);
const sampleCsv = path.join(__dirname, '..', '..', '..', 'data', 'workouts.sample.csv');

/** Queues the given file as the user's next pick in the system file picker. */
function pickFile(filePath: string, sizeOverride?: number) {
  const content = fs.readFileSync(filePath, 'utf8');
  MockFile.pickFileAsync.mockResolvedValueOnce({
    canceled: false,
    result: { size: sizeOverride ?? content.length, text: async () => content },
  });
}

type Ctx = ReturnType<typeof useWorkouts>;
type ImportResult = Awaited<ReturnType<Ctx['importCsv']>>;

/** Mounts the real provider, like the root layout does on app launch. */
function renderWorkouts() {
  return renderHook(() => useWorkouts(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <WorkoutsProvider>{children}</WorkoutsProvider>
    ),
  });
}

async function importCsv(ctx: { current: Ctx }): Promise<ImportResult> {
  let result: ImportResult | undefined;
  await act(async () => {
    result = await ctx.current.importCsv();
  });
  return result!;
}

beforeEach(() => {
  store.clear();
  MockFile.pickFileAsync.mockReset();
});

describe('import flow', () => {
  it('imports the sample export end-to-end and survives an app relaunch', async () => {
    const first = await renderWorkouts();
    pickFile(sampleCsv);
    const result = await importCsv(first.result);

    expect(result).toMatchObject({ ok: true });
    expect(result.count).toBeGreaterThan(250);
    expect(first.result.current.source).toBe('imported');
    expect(first.result.current.importedCount).toBe(result.count);
    expect(first.result.current.workouts).toHaveLength(result.count!);
    expect(first.result.current.needsOnboarding).toBe(false);

    // Both the dataset and the source preference are persisted to disk.
    expect(store.has(IMPORTED_URI)).toBe(true);
    expect(JSON.parse(store.get(SOURCE_PREF_URI)!)).toEqual({ source: 'imported' });

    // Relaunch: a fresh provider must restore the import from disk alone.
    await first.unmount();
    const relaunched = await renderWorkouts();
    expect(relaunched.result.current.source).toBe('imported');
    expect(relaunched.result.current.workouts).toHaveLength(result.count!);
  });

  it('reports cancellation without touching state or disk', async () => {
    const { result: ctx } = await renderWorkouts();
    MockFile.pickFileAsync.mockResolvedValueOnce({ canceled: true });

    const result = await importCsv(ctx);

    expect(result).toMatchObject({ ok: false, canceled: true });
    expect(ctx.current.source).toBe('bundled');
    expect(store.size).toBe(0);
  });

  it.each(['not-an-export.csv', 'empty.csv'])(
    'points the user at workouts.csv when they pick %s',
    async (name) => {
      const { result: ctx } = await renderWorkouts();
      pickFile(fixture(name));

      const result = await importCsv(ctx);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/isn’t a SugarWOD or Chalk It Pro export/);
      expect(result.error).toMatch(/workouts\.csv/);
      expect(ctx.current.source).toBe('bundled');
      expect(store.has(IMPORTED_URI)).toBe(false);
    },
  );

  it('points the user at workouts.csv when the export has no workout rows', async () => {
    const { result: ctx } = await renderWorkouts();
    pickFile(fixture('no-workouts.csv'));

    const result = await importCsv(ctx);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No workouts/);
    expect(result.error).toMatch(/workouts\.csv/);
    expect(store.has(IMPORTED_URI)).toBe(false);
  });

  it('rejects oversized files before reading them', async () => {
    const { result: ctx } = await renderWorkouts();
    pickFile(sampleCsv, 26 * 1024 * 1024);

    const result = await importCsv(ctx);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too large/);
    expect(store.has(IMPORTED_URI)).toBe(false);
  });

  it('clears the import from disk and state on reset', async () => {
    const { result: ctx } = await renderWorkouts();
    pickFile(sampleCsv);
    await importCsv(ctx);

    await act(() => ctx.current.resetImportedData());

    expect(ctx.current.importedCount).toBeNull();
    expect(ctx.current.source).toBe('bundled');
    expect(store.has(IMPORTED_URI)).toBe(false);
    expect(JSON.parse(store.get(SOURCE_PREF_URI)!)).toEqual({ source: 'bundled' });
  });

  it('falls back gracefully when the persisted import is corrupted', async () => {
    store.set(IMPORTED_URI, 'definitely not json');
    store.set(SOURCE_PREF_URI, JSON.stringify({ source: 'imported' }));

    const { result: ctx } = await renderWorkouts();

    expect(ctx.current.source).toBe('bundled');
    expect(ctx.current.importedCount).toBeNull();
  });
});
