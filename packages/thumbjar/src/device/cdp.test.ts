import {afterEach, describe, expect, test, vi} from 'vitest'
import {CommandError, DeviceLost, runStrict} from './adb.ts'
import {cdpEval, setCurrentUrl} from './cdp.ts'

const forward = vi.hoisted(() => ({error: undefined as unknown, calls: 0}))

vi.mock(import('./adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: () => {
    forward.calls += 1
    return forward.error === undefined
      ? Promise.resolve('')
      : Promise.reject(forward.error)
  },
}))

const page = 'http://localhost:8765/editor.html?prefix='

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  forward.error = undefined
  forward.calls = 0
})

describe(cdpEval.name, () => {
  test('a page action transport fault is evaluated only once', async () => {
    const targetLists = stubDroppedTargets()
    setCurrentUrl(page)
    await expect(
      cdpEval('window.__action("select", null)', false),
    ).rejects.toThrow('target list dropped')
    expect(targetLists).toEqual(['/json'])
    expect(forward.calls).toEqual(0)
  })

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

  test("under `runOnDevice`, adb's error for a lost device when it forwards DevTools again ends the evaluation with it, evaluating no more", async () => {
    vi.useFakeTimers()
    const targetLists = stubDroppedTargets()
    const fault = new CommandError(
      'adb forward tcp:9222 localabstract:chrome_devtools_remote exited with 1: error: device offline',
    )
    forward.error = fault
    setCurrentUrl(page)

    const evaluating = runStrict(() => cdpEval('document.readyState')).catch(
      (error: unknown) => error,
    )
    await vi.runAllTimersAsync()

    const error = await evaluating

    expect({
      error,
      cause: (error as Error).cause,
      targetLists: targetLists.length,
      forwards: forward.calls,
    }).toEqual({
      error: new DeviceLost(
        'adb forward tcp:9222 localabstract:chrome_devtools_remote exited with 1: error: device offline',
        fault,
      ),
      cause: fault,
      targetLists: 1,
      forwards: 1,
    })
  })

  test('outside `runOnDevice`, the same error is ignored and the evaluation is retried on a fresh connection', async () => {
    vi.useFakeTimers()
    const targetLists = stubDroppedTargets()
    forward.error = new CommandError(
      'adb forward tcp:9222 localabstract:chrome_devtools_remote exited with 1: error: device offline',
    )
    setCurrentUrl(page)

    const evaluating = cdpEval('document.readyState').catch(
      (error: unknown) => error,
    )
    await vi.runAllTimersAsync()

    expect({
      error: String(await evaluating),
      targetLists: targetLists.length,
      forwards: forward.calls,
    }).toEqual({
      error: 'Error: target list dropped',
      targetLists: 4,
      forwards: 4,
    })
  })
})

function stubDroppedTargets(): string[] {
  const targetLists: string[] = []
  vi.stubGlobal('fetch', () => {
    targetLists.push('/json')
    return Promise.reject(new Error('target list dropped'))
  })
  return targetLists
}

function stubPage(reply: Record<string, unknown>): string[] {
  const evaluations: string[] = []
  vi.stubGlobal('fetch', () =>
    Promise.resolve({
      json: () =>
        Promise.resolve([
          {
            type: 'page',
            url: page,
            webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
          },
        ]),
    }),
  )
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
