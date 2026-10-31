import {afterEach, describe, expect, test, vi} from 'vitest'
import {cdpEval, setCurrentUrl} from './cdp.ts'

const page = 'http://localhost:8765/editor.html?prefix='

afterEach(() => {
  vi.unstubAllGlobals()
})

describe(cdpEval.name, () => {
  test('a reply whose expression threw in the page rejects with the exception, without a second evaluation', async () => {
    const evaluations = stubPage({
      result: {
        result: {type: 'object', subtype: 'error'},
        exceptionDetails: {
          text: 'Uncaught',
          exception: {
            description:
              'TypeError: Cannot read properties of undefined (reading "context")',
          },
        },
      },
    })
    setCurrentUrl(page)

    await expect(cdpEval('window.__state()')).rejects.toThrow(
      'Uncaught in `window.__state()`: TypeError: Cannot read properties of undefined (reading "context")',
    )
    expect(evaluations).toEqual(['window.__state()'])
  })

  test('a reply with a value resolves to the value', async () => {
    stubPage({result: {result: {type: 'string', value: 'complete'}}})
    setCurrentUrl(page)

    await expect(cdpEval('document.readyState')).resolves.toEqual('complete')
  })
})

function stubPage(reply: Record<string, unknown>): string[] {
  const evaluations: string[] = []
  vi.stubGlobal('fetch', async () => ({
    json: async () => [
      {
        type: 'page',
        url: page,
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
        evaluations.push(request.params.expression)
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent('message', {
              data: JSON.stringify({id: request.id, ...reply}),
            }),
          ),
        )
      }
      close() {}
    },
  )
  return evaluations
}
