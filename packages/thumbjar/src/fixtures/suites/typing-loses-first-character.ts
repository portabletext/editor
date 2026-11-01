import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: (_options: unknown, {prefix}: {prefix: string}) =>
    Promise.resolve({
      text: `${prefix}ｋ用今日`,
      picked: ['今日'],
      compositionstart: 2,
      nested: 1,
      compositionstartPerWord: [2],
    }),
  dumpFailure: async () => {},
  closeChrome: async () => {},
  clearChromeTabs: async () => {},
}))
