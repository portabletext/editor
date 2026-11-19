import {vi} from 'vitest'
import {sleep} from '../../device/util.ts'

const calls: string[] = []

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => {
  let attempts = 0
  return {
    ...(await importOriginal()),
    runInChrome: () => {
      attempts += 1
      calls.push(`attempt ${attempts}`)
      if (attempts === 1) {
        return Promise.reject(new Error('Gboard window did not appear'))
      }
      return Promise.resolve({
        steps: [],
        selection: null,
        events: [],
        text: '今日',
      })
    },
    dumpFailure: async () => {
      calls.push('dump start')
      try {
        await sleep(3600)
      } finally {
        calls.push('dump stopped')
      }
    },
    stopChromeForRetry: () => {
      calls.push('close chrome')
      return Promise.resolve(['100'])
    },
    closeChrome: () => {
      calls.push('close chrome')
      return Promise.resolve()
    },
  }
})

declare global {
  var deviceCalls: string[]
}
globalThis.deviceCalls = calls
