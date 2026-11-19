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

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  runInChrome: () =>
    Promise.resolve({
      steps: [],
      selection: null,
      events: [],
      text: '今日',
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
