import {vi} from 'vitest'

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => {
  let attempts = 0
  return {
    ...(await importOriginal()),
    runInChrome: () => {
      attempts += 1
      if (attempts === 1) {
        return Promise.reject(new Error('Gboard window did not appear'))
      }
      return Promise.resolve({
        steps: [],
        selection: null,
        events: [],
        text: 'ｋ用今日',
      })
    },
    dumpFailure: async () => {},
    stopChromeForRetry: () => Promise.resolve(['100']),
    closeChrome: async () => {},
  }
})
