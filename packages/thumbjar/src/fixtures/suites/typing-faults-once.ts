import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => {
  let attempts = 0
  return {
    ...(await importOriginal()),
    typeInChrome: () => {
      attempts += 1
      if (attempts === 1) {
        return Promise.reject(new Error('Gboard window did not appear'))
      }
      return Promise.resolve({
        text: 'ｋ用今日',
        picked: ['今日'],
        compositionstart: 2,
        nested: 1,
        compositionstartPerWord: [2],
      })
    },
    dumpFailure: async () => {},
    closeChrome: async () => {},
    clearChromeTabs: async () => {},
  }
})
