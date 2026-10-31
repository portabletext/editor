import {readFileSync} from 'node:fs'
import {vi} from 'vitest'

const page = vi.hoisted(() => ({attempt: 0}))

vi.mock(import('../../lib/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: async (args: string[]) =>
    args.includes('input_method') ? 'mInputShown=true' : '',
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

// The page's DevTools endpoint. On the first attempt `window.__state()` throws, the way the editor's
// `getSnapshot` would, and the reply carries `exceptionDetails` instead of a value.
const url = 'http://localhost:8765/editor.html?prefix='
vi.stubGlobal('fetch', async () => ({
  json: async () => [
    {
      type: 'page',
      url,
      webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
    },
  ],
}))
vi.stubGlobal(
  'WebSocket',
  class extends EventTarget {
    constructor() {
      super()
      queueMicrotask(() => this.dispatchEvent(new Event('open')))
    }
    send(data: string) {
      const request = JSON.parse(data) as {
        id: number
        params: {expression: string}
      }
      queueMicrotask(() =>
        this.dispatchEvent(
          new MessageEvent('message', {
            data: JSON.stringify({
              id: request.id,
              result: evaluate(request.params.expression),
            }),
          }),
        ),
      )
    }
    close() {}
  },
)

function evaluate(expression: string): Record<string, unknown> {
  if (expression === 'document.readyState') return value('complete')
  if (expression === 'typeof window.__state') return value('function')
  if (expression === 'location.href') return value(url)
  if (expression.startsWith('document.activeElement')) return value(true)
  if (expression.includes('getBoundingClientRect')) {
    page.attempt += 1
    return value({
      x: 100,
      y: 100,
      devicePixelRatio: 1,
      innerHeight: 800,
      screenHeight: 800,
    })
  }
  if (expression === 'window.__state()' && page.attempt === 1) {
    return {
      result: {type: 'object', subtype: 'error'},
      exceptionDetails: {
        text: 'Uncaught',
        exception: {description: 'Error: getSnapshot failed'},
      },
    }
  }
  if (expression === 'window.__state()')
    return value({text: 'Kyou ', events: []})
  return {result: {type: 'undefined'}}
}

function value(result: unknown): Record<string, unknown> {
  return {result: {type: typeof result, value: result}}
}
