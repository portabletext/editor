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
  closeChrome: () => chromeStop.stopped,
  clearChromeTabs: async () => {
    globalThis.chromeTabsCleared = true
  },
}))

declare global {
  var finishChromeStop: () => void
  var chromeTabsCleared: boolean
}
globalThis.chromeTabsCleared = false
globalThis.finishChromeStop = chromeStop.release
