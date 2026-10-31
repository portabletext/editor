import {readFileSync} from 'node:fs'
import {vi} from 'vitest'

const page = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  attempts: 0,
}))

vi.mock(import('../../lib/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: async (args: string[]) =>
    args.includes('input_method') ? 'mInputShown=true' : '',
}))

vi.mock(import('../../lib/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  targets: async () => [],
  cdpEval: async (expression: string) => {
    if (expression === 'document.readyState') return 'complete'
    if (expression === 'typeof window.__state') return 'function'
    if (expression === 'location.href')
      return 'http://localhost:8765/editor.html'
    if (expression.startsWith('document.activeElement')) return true
    if (expression === 'window.__state()') return page.state
    if (expression.includes('getBoundingClientRect')) {
      page.attempts += 1
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

vi.mock(import('../../lib/u2.ts'), async (importOriginal) => {
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
  /** What `window.__state()` returns for the rest of the test. */
  var pageState: Record<string, unknown>
  /** The attempts that reached the field since `pageState` was set. */
  var pageAttempts: () => number
}
Object.defineProperty(globalThis, 'pageState', {
  set: (state: Record<string, unknown>) => {
    page.state = state
    page.attempts = 0
  },
})
globalThis.pageAttempts = () => page.attempts
