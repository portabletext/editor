import {vi} from 'vitest'

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
        steps: [
          {
            type: 'enter',
            status: 'done',
            textAfter: 'foo\n',
            selectionAfter: {anchor: 4, focus: 4},
            events: [],
          },
        ],
        text: 'foo\n',
        selection: {anchor: 4, focus: 4},
        events: [],
      })
    },
    dumpFailure: async () => {},
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
