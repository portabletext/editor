import {readFileSync} from 'node:fs'
import {vi} from 'vitest'
import {PageExceptionError} from '../../device/cdp.ts'
import {sleep} from '../../device/util.ts'
import {FIELD_FOCUSED, FIELD_RECT} from '../../gboard/field.ts'

/**
 * How one attempt fails: the device rejects its `rejectedTap`th tap, the field's being the first, or
 * reading its `failingBoundary`th boundary, the one before the first step being the first, throws
 * `boundaryError`. Either throws `error` instead when the fault has one. With `abort`, reading that
 * boundary aborts `abort` with `error` instead, the way a test's timeout aborts its signal, and waits.
 */
type AttemptFault = {
  error?: unknown
  rejectedTap?: number
  failingBoundary?: number
  boundaryError?: 'driver' | 'page'
  abort?: AbortController
}

const page = vi.hoisted(() => ({
  faults: [] as AttemptFault[],
  attempt: 0,
  taps: 0,
  boundaries: 0,
}))

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
    click: () => {
      page.taps += 1
      const fault = page.faults[page.attempt - 1]
      if (page.taps === fault?.rejectedTap) {
        return Promise.reject(
          'error' in fault
            ? fault.error
            : new Error(`injected tap ${page.taps} was rejected`),
        )
      }
      return Promise.resolve()
    },
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
  var attemptFaults: AttemptFault[]
}
Object.defineProperty(globalThis, 'attemptFaults', {
  set: (faults: AttemptFault[]) => {
    page.faults = faults
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
    return 'http://localhost:8765/editor.html?prefix=foo'
  }
  if (expression === FIELD_FOCUSED) {
    return true
  }
  if (expression === FIELD_RECT) {
    page.attempt += 1
    page.taps = 0
    page.boundaries = 0
    return {
      x: 100,
      y: 100,
      devicePixelRatio: 1,
      innerHeight: 800,
      screenHeight: 800,
    }
  }
  if (expression.startsWith('({state: window.__state()')) {
    page.boundaries += 1
    const fault = page.faults[page.attempt - 1]
    if (page.boundaries === fault?.failingBoundary) {
      if (fault.abort) {
        fault.abort.abort(fault.error)
        return sleep(60)
      }
      if ('error' in fault) {
        throw fault.error
      }
      throw fault.boundaryError === 'page'
        ? new PageExceptionError(
            'Uncaught in `window.__state()`: Error: getSnapshot failed',
          )
        : new Error(`boundary ${page.boundaries} could not be read`)
    }
    // The page's text after each Backspace.
    const text = 'foo'.slice(0, 4 - page.boundaries)
    return {
      state: {text, events: []},
      selection: {text, anchor: text.length, focus: text.length},
    }
  }
  return undefined
}
