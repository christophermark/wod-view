// Integration tests for production preview-mode semantics: who can enter
// preview, and where each exit lands. The real WorkoutsProvider runs against
// an in-memory expo-file-system, with the bundled dataset mocked empty to
// simulate a release build (the __DEV__ require is stripped from those).

import { act, renderHook } from '@testing-library/react-native';
import fs from 'node:fs';
import path from 'node:path';
import { ReactNode } from 'react';

import { useWorkouts, WorkoutsProvider } from '../data-context';

jest.mock('@/data/workouts.json', () => []);

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

const sampleCsv = path.join(__dirname, '..', '..', '..', 'data', 'workouts.sample.csv');

/** Queues the given file as the user's next pick in the system file picker. */
function pickFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  MockFile.pickFileAsync.mockResolvedValueOnce({
    canceled: false,
    result: { size: content.length, text: async () => content },
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

describe('preview mode rules (production: bundled dataset empty)', () => {
  it('first launch needs onboarding', async () => {
    const { result: ctx } = await renderWorkouts();

    expect(ctx.current.source).toBe('bundled');
    expect(ctx.current.needsOnboarding).toBe(true);
  });

  it('exiting sample data with nothing to fall back on returns to onboarding', async () => {
    const { result: ctx } = await renderWorkouts();

    await act(() => ctx.current.enterPreview());
    expect(ctx.current.source).toBe('preview');
    expect(ctx.current.needsOnboarding).toBe(false);

    await act(() => ctx.current.exitPreview());
    expect(ctx.current.source).toBe('bundled');
    expect(ctx.current.needsOnboarding).toBe(true);
  });

  it('importing from inside sample data replaces it', async () => {
    const { result: ctx } = await renderWorkouts();
    await act(() => ctx.current.enterPreview());

    pickFile(sampleCsv);
    const result = await importCsv(ctx);

    expect(result).toMatchObject({ ok: true });
    expect(ctx.current.source).toBe('imported');
    expect(ctx.current.needsOnboarding).toBe(false);
    expect(ctx.current.importedCount).toBeGreaterThan(0);
  });

  it('sample data is off-limits once real data is imported', async () => {
    const { result: ctx } = await renderWorkouts();
    pickFile(sampleCsv);
    await importCsv(ctx);
    expect(ctx.current.source).toBe('imported');

    await act(() => ctx.current.enterPreview());

    expect(ctx.current.source).toBe('imported');
  });

  it('clearing imported data re-opens onboarding and re-enables sample data', async () => {
    const { result: ctx } = await renderWorkouts();
    pickFile(sampleCsv);
    await importCsv(ctx);

    await act(() => ctx.current.resetImportedData());
    expect(ctx.current.source).toBe('bundled');
    expect(ctx.current.needsOnboarding).toBe(true);

    await act(() => ctx.current.enterPreview());
    expect(ctx.current.source).toBe('preview');
  });
});
