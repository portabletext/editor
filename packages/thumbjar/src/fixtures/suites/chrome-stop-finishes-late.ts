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
  typeInChrome: () =>
    Promise.resolve({
      text: '今日',
      picked: ['今日'],
      compositionstart: 1,
      nested: 0,
      compositionstartPerWord: [1],
    }),
  closeChrome: () => chromeStop.stopped,
  clearChromeTabs: () => {
    globalThis.chromeTabsCleared = true
    return Promise.resolve()
  },
}))

declare global {
  var finishChromeStop: () => void
  var chromeTabsCleared: boolean
}
globalThis.chromeTabsCleared = false
globalThis.finishChromeStop = chromeStop.release
