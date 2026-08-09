// Dev-only: multiple local data/*.csv files become selectable "bundled" data
// sources (Settings → DATA SOURCE). The real WorkoutsProvider runs against an
// in-memory expo-file-system with two dev datasets mocked in.

import { act, renderHook } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { useWorkouts, WorkoutsProvider } from '../data-context';

// The factory below runs before this module's own top-level statements (it's
// hoisted above the `import` that pulls in data-context, which requires this
// mock synchronously), so it can't reference outer variables — everything it
// needs has to be inlined.
jest.mock('@/data/dev-datasets.json', () => {
  const workout = (id: string, date: string) => ({
    id,
    date,
    title: 'Test WOD',
    description: '',
    score: '',
    scoreRaw: null,
    scoreType: '',
    barbellLift: '',
    sets: [],
    notes: '',
    rx: false,
    pr: false,
  });
  return [
    {
      id: 'workouts',
      label: 'MY HISTORY',
      file: 'workouts.csv',
      count: 2,
      workouts: [workout('a', '2026-01-01'), workout('b', '2026-01-02')],
    },
    {
      id: 'results',
      label: 'RESULTS',
      file: 'results.csv',
      count: 3,
      workouts: [
        workout('c', '2026-02-01'),
        workout('d', '2026-02-02'),
        workout('e', '2026-02-03'),
      ],
    },
  ];
});

// Read the mock back to drive assertions instead of duplicating its shape.
const [FIRST, SECOND] = jest.requireMock('@/data/dev-datasets.json') as {
  id: string;
  count: number;
}[];

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

const { __store: store } = jest.requireMock('expo-file-system') as {
  __store: Map<string, string>;
};

/** Mounts the real provider, like the root layout does on app launch. */
function renderWorkouts() {
  return renderHook(() => useWorkouts(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <WorkoutsProvider>{children}</WorkoutsProvider>
    ),
  });
}

beforeEach(() => {
  store.clear();
});

describe('dev datasets (multiple local data/*.csv as bundled sources)', () => {
  it('defaults to the first dev dataset', async () => {
    const { result: ctx } = await renderWorkouts();

    expect(ctx.current.devDatasets).toHaveLength(2);
    expect(ctx.current.bundledDatasetId).toBe(FIRST.id);
    expect(ctx.current.workouts).toHaveLength(FIRST.count);
  });

  it('switching datasets updates the visible workouts and survives a remount', async () => {
    const first = await renderWorkouts();

    await act(() => first.result.current.useBundled(SECOND.id));

    expect(first.result.current.bundledDatasetId).toBe(SECOND.id);
    expect(first.result.current.workouts).toHaveLength(SECOND.count);

    // The choice is persisted to disk, so a fresh provider (relaunch) restores it.
    await first.unmount();
    const relaunched = await renderWorkouts();
    expect(relaunched.result.current.bundledDatasetId).toBe(SECOND.id);
    expect(relaunched.result.current.workouts).toHaveLength(SECOND.count);
  });
});
