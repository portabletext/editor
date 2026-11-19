import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  runInChrome: () =>
    Promise.resolve({
      steps: [],
      selection: null,
      events: [],
      text: 'ｋ用今日',
    }),
  dumpFailure: async () => {},
  closeChrome: () => new Promise<void>(() => {}),
}))
