import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  runInChrome: (_options: unknown, {prefix}: {prefix: string}) =>
    Promise.resolve({
      steps: [],
      selection: null,
      events: [],
      text: `${prefix}ｋ用今日`,
    }),
  dumpFailure: async () => {},
  closeChrome: async () => {},
}))
