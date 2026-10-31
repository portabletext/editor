import {vi} from 'vitest'
import {sleep} from '../../device/util.ts'

const calls: string[] = []

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => {
  let attempts = 0
  return {
    ...(await importOriginal()),
    typeInChrome: () => {
      attempts += 1
      calls.push(`attempt ${attempts}`)
      if (attempts === 1) {
        return Promise.reject(new Error('Gboard window did not appear'))
      }
      return Promise.resolve({
        text: '今日',
        picked: ['今日'],
        compositionstart: 1,
        nested: 0,
        compositionstartPerWord: [1],
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
    closeChrome: () => {
      calls.push('close chrome')
      return Promise.resolve()
    },
    clearChromeTabs: () => {
      calls.push('clear tabs')
      return Promise.resolve()
    },
  }
})

declare global {
  var deviceCalls: string[]
}
globalThis.deviceCalls = calls
