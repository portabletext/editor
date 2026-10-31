// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {cdpEval, PageExceptionError, setCurrentUrl} from '../scripts/lib/cdp'

// The page in jsdom, read through `cdpEval` the way the driver reads it, with a DevTools socket that
// evaluates the expression in this window and answers like Chrome's `Runtime.evaluate`.

const snapshot = vi.hoisted(() => ({fails: false}))

vi.mock(import('@portabletext/editor'), async (importOriginal) => {
  const original = await importOriginal()
  const wrapped = new WeakSet()
  return {
    ...original,
    useEditor: () => {
      const editor = original.useEditor()
      if (!wrapped.has(editor)) {
        wrapped.add(editor)
        const getSnapshot = editor.getSnapshot
        editor.getSnapshot = () => {
          if (snapshot.fails) throw new Error('snapshot unavailable')
          return getSnapshot()
        }
      }
      return editor
    },
  }
})

let root: {unmount: () => void} | undefined

beforeEach(() => {
  snapshot.fails = false
  document.body.innerHTML = '<div id="root"></div><pre id="log"></pre>'
  vi.stubGlobal('fetch', async () => ({
    json: async () => [
      {
        type: 'page',
        url: location.href,
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
        let result: Record<string, unknown>
        try {
          const value: unknown = (0, eval)(request.params.expression)
          result = {result: {value: JSON.parse(JSON.stringify(value))}}
        } catch (error) {
          result = {
            result: {type: 'object', subtype: 'error'},
            exceptionDetails: {
              text: 'Uncaught',
              exception: {description: String(error)},
            },
          }
        }
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent('message', {
              data: JSON.stringify({id: request.id, result}),
            }),
          ),
        )
      }
      close() {}
    },
  )
})

afterEach(async () => {
  root?.unmount()
  root = undefined
  delete (window as Partial<Window>).__state
  vi.unstubAllGlobals()
})

async function loadPage(search: string): Promise<void> {
  history.replaceState(null, '', `/editor.html${search}`)
  setCurrentUrl(location.href)
  vi.resetModules()
  root = ((await import('./editor')) as {root: {unmount: () => void}}).root
  await vi.waitFor(async () =>
    expect(
      ((await cdpEval('window.__state()')) as {text: string}).text,
    ).toEqual('foo'),
  )
}

describe('`window.__state` once the editor fails to give its snapshot after a read with the final text', () => {
  test('throws in the shipped page, so the driver gets a `PageExceptionError`', async () => {
    await loadPage('?prefix=foo')
    snapshot.fails = true

    const read = cdpEval('window.__state()')

    await expect(read).rejects.toThrow(PageExceptionError)
    await expect(read).rejects.toThrow(
      'Uncaught in `window.__state()`: Error: snapshot unavailable',
    )
  })

  test('returns the last text read with the error recorded in a crash page', async () => {
    await loadPage(`?prefix=foo&decorate=${encodeURIComponent('きょう')}`)
    snapshot.fails = true

    const state = (await cdpEval('window.__state()')) as Record<string, unknown>

    expect({text: state.text, errors: state.errors}).toEqual({
      text: 'foo',
      errors: ['Error: snapshot unavailable'],
    })
  })
})
