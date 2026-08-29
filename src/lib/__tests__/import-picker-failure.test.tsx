// The Samsung-class failure: nothing on the device answers the picker intent,
// expo reports that as an ordinary cancellation, and the import screens — which
// stay quiet on cancel, as they should — render nothing at all. These tests pin
// the difference between "the user changed their mind" and "no picker ever
// appeared", so the second one keeps reaching the user as an explanation.

import { act, renderHook } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { useWorkouts, WorkoutsProvider } from '../data-context';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: {
    OS: 'android',
    Version: 34,
    isPad: false,
    isTV: false,
    isTesting: true,
    constants: { reactNativeVersion: { major: 0, minor: 86, patch: 0 } },
    select: (spec: Record<string, unknown>) => spec.android ?? spec.default,
  },
}));

// Captures the handler data-context registers, so a test can decide whether the
// app ever left the foreground — the only evidence that a picker was shown.
let mockForegroundHandler: ((state: string) => void) | undefined;
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: (_event: string, handler: (state: string) => void) => {
      mockForegroundHandler = handler;
      return {
        remove: () => {
          mockForegroundHandler = undefined;
        },
      };
    },
  },
}));

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
      store.delete(this.uri);
    }
    static pickFileAsync = jest.fn();
  }
  return { File, Paths: { document: 'file:///documents' }, __store: store };
});

const { File: MockFile, __store: store } = jest.requireMock('expo-file-system') as {
  File: { pickFileAsync: jest.Mock };
  __store: Map<string, string>;
};

type Ctx = ReturnType<typeof useWorkouts>;

function renderWorkouts() {
  return renderHook(() => useWorkouts(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <WorkoutsProvider>{children}</WorkoutsProvider>
    ),
  });
}

async function importCsv(ctx: { current: Ctx }) {
  let result: Awaited<ReturnType<Ctx['importCsv']>> | undefined;
  await act(async () => {
    result = await ctx.current.importCsv();
  });
  return result!;
}

beforeEach(() => {
  store.clear();
  MockFile.pickFileAsync.mockReset();
  mockForegroundHandler = undefined;
});

describe('a picker that never opens', () => {
  it('explains itself instead of leaving the user with a dead button', async () => {
    // No activity handled the intent: expo rejects, its wrapper reports a
    // cancellation, and the app was never backgrounded because nothing showed.
    MockFile.pickFileAsync.mockResolvedValueOnce({ canceled: true, result: null });

    const { result: ctx } = await renderWorkouts();
    const result = await importCsv(ctx);

    expect(result.canceled).toBeFalsy();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/didn’t open a file picker/);
  });

  it('stays silent when the picker really did open and the user backed out', async () => {
    MockFile.pickFileAsync.mockImplementationOnce(async () => {
      // Showing the picker backgrounds the app before any result arrives.
      mockForegroundHandler?.('background');
      return { canceled: true, result: null };
    });

    const { result: ctx } = await renderWorkouts();
    const result = await importCsv(ctx);

    expect(result).toMatchObject({ ok: false, canceled: true });
    expect(result.error).toBeUndefined();
  });
});
