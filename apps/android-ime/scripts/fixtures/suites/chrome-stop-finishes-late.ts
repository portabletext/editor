import {vi} from 'vitest'

const chromeStop = vi.hoisted(() => {
  let release!: () => void
  return {
    stopped: new Promise<void>((resolve) => {
      release = resolve
    }),
    release: () => release(),
  }
})

vi.mock(import('../../lib/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: async () => ({
    text: '今日',
    picked: ['今日'],
    compositionstart: 1,
    nested: 0,
    compositionstartPerWord: [1],
  }),
  closeChrome: async () => {
    await chromeStop.stopped
    globalThis.chromeStopReturned = true
  },
}))

declare global {
  var finishChromeStop: () => void
  var chromeStopReturned: boolean
}
globalThis.chromeStopReturned = false
globalThis.finishChromeStop = chromeStop.release
