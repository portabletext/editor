import {readFileSync} from 'node:fs'
import {vi} from 'vitest'

const page = vi.hoisted(() => ({texts: [] as string[], attempt: 0}))

vi.mock(import('../../device/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: (args: string[]) =>
    Promise.resolve(args.includes('input_method') ? 'mInputShown=true' : ''),
}))

vi.mock(import('../../device/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  targets: () => Promise.resolve([]),
  cdpEval: (expression: string) => Promise.resolve(pageReply(expression)),
}))

// Keep this fake device in sync with the one in `page-throws-once.ts`.
vi.mock(import('../../device/u2.ts'), async (importOriginal) => {
  const keyboard = readFileSync(
    new URL('../en-keyboard.xml', import.meta.url),
    'utf8',
  )
  const device = {
    waitTimeout: 20,
    info: () => Promise.resolve({productName: 'fake'}),
    windowSize: () => Promise.resolve<[number, number]>([1080, 2400]),
    appCurrent: () =>
      Promise.resolve({
        package: 'com.android.chrome',
        activity: 'Main',
        pid: 1,
      }),
    screenshot: async () => {},
    dumpHierarchy: () => Promise.resolve(keyboard),
    click: async () => {},
    swipe: async () => {},
    close: async () => {},
    find: () => ({
      exists: () => Promise.resolve(false),
      click: async () => {},
      getText: () => Promise.resolve(''),
    }),
  }
  return {
    ...(await importOriginal()),
    Device: {connect: () => Promise.resolve(device)} as never,
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

function pageReply(expression: string): unknown {
  if (expression === 'document.readyState') {
    return 'complete'
  }
  if (expression === 'typeof window.__state') {
    return 'function'
  }
  if (expression === 'location.href') {
    return 'http://localhost:8765/plain.html'
  }
  if (expression.startsWith('document.activeElement')) {
    return true
  }
  if (expression === 'window.__state()') {
    return {text: page.texts[page.attempt - 1] ?? '', events: []}
  }
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
}
