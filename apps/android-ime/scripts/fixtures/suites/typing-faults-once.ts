import {vi} from 'vitest'

vi.mock(import('../../lib/typing.ts'), async (importOriginal) => {
  let attempts = 0
  return {
    ...(await importOriginal()),
    typeInChrome: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('Gboard window did not appear')
      return {
        text: 'ｋ用今日',
        picked: ['今日'],
        compositionstart: 2,
        nested: 1,
        compositionstartPerWord: [2],
      }
    },
    dumpFailure: async () => {},
    closeChrome: async () => {},
  }
})
