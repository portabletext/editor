import {readFileSync} from 'node:fs'
import {vi} from 'vitest'

const page = vi.hoisted(() => ({texts: [] as string[], attempt: 0}))

vi.mock(import('../../device/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: async (args: string[]) =>
    args.includes('input_method') ? 'mInputShown=true' : '',
}))

vi.mock(import('../../device/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  targets: async () => [],
  cdpEval: async (expression: string) => {
    if (expression === 'document.readyState') return 'complete'
    if (expression === 'typeof window.__state') return 'function'
    if (expression === 'location.href')
      return 'http://localhost:8765/plain.html'
    if (expression.startsWith('document.activeElement')) return true
    if (expression === 'window.__state()')
      return {text: page.texts[page.attempt - 1] ?? '', events: []}
    if (expression.includes('getBoundingClientRect')) {
      page.attempt += 1
      return {
        x: 100,
        y: 100,
        devicePixelRatio: 1,
        innerHeight: 800,
        screenHeight: 800,
      }
    }
    return undefined
  },
}))

// Keep this fake device in sync with the one in `page-throws-once.ts`.
vi.mock(import('../../device/u2.ts'), async (importOriginal) => {
  const keyboard = readFileSync(
    new URL('../en-keyboard.xml', import.meta.url),
    'utf8',
  )
  const device = {
    waitTimeout: 20,
    info: async () => ({productName: 'fake'}),
    windowSize: async () => [1080, 2400] as [number, number],
    appCurrent: async () => ({
      package: 'com.android.chrome',
      activity: 'Main',
      pid: 1,
    }),
    screenshot: async () => {},
    dumpHierarchy: async () => keyboard,
    click: async () => {},
    swipe: async () => {},
    close: async () => {},
    find: () => ({
      exists: async () => false,
      click: async () => {},
      getText: async () => '',
    }),
  }
  return {
    ...(await importOriginal()),
    Device: {connect: async () => device} as never,
  }
})

declare global {
  var pageTexts: string[]
}
Object.defineProperty(globalThis, 'pageTexts', {
  set: (texts: string[]) => {
    page.texts = texts
    page.attempt = 0
  },
})
