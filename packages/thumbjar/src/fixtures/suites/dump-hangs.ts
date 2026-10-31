import {vi} from 'vitest'
import {sleep} from '../../device/util.ts'

const calls: string[] = []

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => {
  let attempts = 0
  return {
    ...(await importOriginal()),
    typeInChrome: async () => {
      attempts += 1
      calls.push(`attempt ${attempts}`)
      if (attempts === 1) throw new Error('Gboard window did not appear')
      return {
        text: '今日',
        picked: ['今日'],
        compositionstart: 1,
        nested: 0,
        compositionstartPerWord: [1],
      }
    },
    dumpFailure: async () => {
      calls.push('dump start')
      try {
        await sleep(3600)
      } finally {
        calls.push('dump stopped')
      }
    },
    closeChrome: async () => {
      calls.push('close chrome')
    },
    clearChromeTabs: async () => {
      calls.push('clear tabs')
    },
  }
})

declare global {
  var deviceCalls: string[]
}
globalThis.deviceCalls = calls
