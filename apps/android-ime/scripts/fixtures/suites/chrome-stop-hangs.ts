import {vi} from 'vitest'

vi.mock(import('../../lib/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: async () => ({
    text: 'ｋ用今日',
    picked: ['今日'],
    compositionstart: 2,
    nested: 1,
    compositionstartPerWord: [2],
  }),
  dumpFailure: async () => {},
  closeChrome: () => new Promise<void>(() => {}),
  clearChromeTabs: async () => {},
}))
