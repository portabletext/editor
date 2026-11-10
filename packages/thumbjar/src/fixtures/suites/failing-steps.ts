import {expect, test, vi} from 'vitest'
import {PageExceptionError} from '../../device/cdp.ts'
import {driverRuns, runOnDevice} from '../../driver.ts'

test('Scenario: Backspace, Enter and Backspace fail before any input, then on Enter in the retry', async (context) => {
  vi.useFakeTimers()
  globalThis.attemptFaults = [{failingBoundary: 1}, {rejectedTap: 3}]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}, {type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    cause: String((error as Error).cause),
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isError: true,
    message: [
      'injected tap 3 was rejected',
      'Steps:',
      "  1. backspace: done, textAfter 'fo', keys Delete",
      "  2. enter: failed (Error: injected tap 3 was rejected), textAfter 'f', keys Enter",
      '  3. backspace: skipped (step 2 failed), textAfter None, keys none',
    ].join('\n'),
    cause: 'Error: injected tap 3 was rejected',
    state: 'inconclusive',
  })
})

test('Scenario: Enter fails before the first step on both attempts', async (context) => {
  vi.useFakeTimers()
  globalThis.attemptFaults = [{failingBoundary: 1}, {failingBoundary: 1}]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isError: true,
    message: 'boundary 1 could not be read',
    state: 'faulted',
  })
})

test('Scenario: The page throws after Backspace, ending the call without a retry', async (context) => {
  vi.useFakeTimers()
  globalThis.attemptFaults = [{failingBoundary: 2, boundaryError: 'page'}]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isPageException: (error as Error).cause instanceof PageExceptionError,
    message: (error as Error).message,
    run: driverRuns.at(-1),
  }).toEqual({
    isPageException: true,
    message: [
      'Uncaught in `window.__state()`: Error: getSnapshot failed',
      'Steps:',
      "  1. backspace: failed (PageExceptionError: Uncaught in `window.__state()`: Error: getSnapshot failed), textAfter 'f', keys Delete",
      '  2. enter: skipped (step 1 failed), textAfter None, keys none',
    ].join('\n'),
    run: {
      test: 'Scenario: The page throws after Backspace, ending the call without a retry',
      fails: false,
      state: 'page-exception',
      taps: [{keys: ['Delete'], events: []}],
      pageException:
        'Uncaught in `window.__state()`: Error: getSnapshot failed',
    },
  })
})

test('Scenario: A step error thrown again before the first step of the retry is unchanged', async (context) => {
  vi.useFakeTimers()
  const tapFailed = new Error('tap failed')
  globalThis.attemptFaults = [
    {failingLookup: true, error: tapFailed},
    {failingBoundary: 1, error: tapFailed},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isOriginal: error === tapFailed,
    message: (error as Error).message,
  }).toEqual({
    isOriginal: true,
    message: 'tap failed',
  })
})

test('Scenario: An error thrown by a step in two calls carries only the records of each call', async (context) => {
  vi.useFakeTimers()
  const tapFailed = new Error('tap failed')
  const messages: string[] = []
  for (let call = 0; call < 2; call++) {
    globalThis.attemptFaults = [
      {failingBoundary: 1, error: tapFailed},
      {rejectedTap: 3, error: tapFailed},
    ]
    const running = runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'backspace'}, {type: 'enter'}],
    }).catch((error: unknown) => error)
    await vi.runAllTimersAsync()
    const error = await running
    expect((error as Error).cause).toBe(tapFailed)
    messages.push((error as Error).message)
  }

  const message = [
    'tap failed',
    'Steps:',
    "  1. backspace: done, textAfter 'fo', keys Delete",
    "  2. enter: failed (Error: tap failed), textAfter 'f', keys Enter",
  ].join('\n')
  expect({messages, original: tapFailed.message}).toEqual({
    messages: [message, message],
    original: 'tap failed',
  })
})

test('Scenario: A frozen step error is the cause of the error with the records', async (context) => {
  vi.useFakeTimers()
  const tapFailed = Object.freeze(new Error('tap failed'))
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: tapFailed},
    {rejectedTap: 2, error: tapFailed},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    isCause: (error as Error).cause === tapFailed,
  }).toEqual({
    isError: true,
    message: [
      'tap failed',
      'Steps:',
      "  1. backspace: failed (Error: tap failed), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
  })
})

test('Scenario: A step that throws a string fails with the string and the records', async (context) => {
  vi.useFakeTimers()
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: 'tap failed'},
    {rejectedTap: 2, error: 'tap failed'},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    cause: (error as Error).cause,
  }).toEqual({
    isError: true,
    message: [
      'tap failed',
      'Steps:',
      "  1. backspace: failed (tap failed), textAfter 'fo', keys Delete",
    ].join('\n'),
    cause: 'tap failed',
  })
})

test('Scenario: A step that throws a value whose `toString` throws fails with that value as the cause', async (context) => {
  vi.useFakeTimers()
  const unprintable = {
    toString: () => {
      throw new Error('toString failed')
    },
  }
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: unprintable},
    {rejectedTap: 2, error: unprintable},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    isCause: (error as Error).cause === unprintable,
  }).toEqual({
    isError: true,
    message: [
      '<thrown value that cannot be converted to text>',
      'Steps:',
      "  1. backspace: failed (<thrown value that cannot be converted to text>), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
  })
})

test('Scenario: A step error whose `message` getter throws is the cause of the error with the records', async (context) => {
  vi.useFakeTimers()
  const unprintable = Object.defineProperty(
    new Error('tap failed'),
    'message',
    {
      get: () => {
        throw new Error('message failed')
      },
    },
  )
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: unprintable},
    {rejectedTap: 2, error: unprintable},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    isCause: (error as Error).cause === unprintable,
  }).toEqual({
    isError: true,
    message: [
      '<thrown value that cannot be converted to text>',
      'Steps:',
      "  1. backspace: failed (<thrown value that cannot be converted to text>), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
  })
})

test('Scenario: A step error whose `message` is an object whose `toString` throws is the cause of the error with the records', async (context) => {
  vi.useFakeTimers()
  const unprintable = Object.defineProperty(
    new Error('tap failed'),
    'message',
    {
      get: () => ({
        toString: () => {
          throw new Error('toString failed')
        },
      }),
    },
  )
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: unprintable},
    {rejectedTap: 2, error: unprintable},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    isCause: (error as Error).cause === unprintable,
  }).toEqual({
    isError: true,
    message: [
      '<thrown value that cannot be converted to text>',
      'Steps:',
      "  1. backspace: failed (<thrown value that cannot be converted to text>), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
  })
})

test('Scenario: A step error whose `message` is a Symbol fails with its description and the records', async (context) => {
  vi.useFakeTimers()
  const symbolic = Object.defineProperty(new Error('tap failed'), 'message', {
    get: () => Symbol('tap failed'),
  })
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: symbolic},
    {rejectedTap: 2, error: symbolic},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    isCause: (error as Error).cause === symbolic,
  }).toEqual({
    isError: true,
    message: [
      'Symbol(tap failed)',
      'Steps:',
      "  1. backspace: failed (Error: Symbol(tap failed)), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
  })
})

test('Scenario: A step that throws NaN fails with NaN and the records', async (context) => {
  vi.useFakeTimers()
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: Number.NaN},
    {rejectedTap: 2, error: Number.NaN},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    cause: (error as Error).cause,
  }).toEqual({
    isError: true,
    message: [
      'NaN',
      'Steps:',
      "  1. backspace: failed (NaN), textAfter 'fo', keys Delete",
    ].join('\n'),
    cause: Number.NaN,
  })
})

test('Scenario: A step that throws a revoked Proxy is retried as a driver fault', async (context) => {
  vi.useFakeTimers()
  const {proxy, revoke} = Proxy.revocable({}, {})
  revoke()
  globalThis.attemptFaults = [{failingBoundary: 1, error: proxy}, {}]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    steps: run.steps.map((record) => record.status),
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    text: 'fo',
    steps: ['done'],
    state: 'complete',
  })
})

test('Scenario: A step that throws a revoked Proxy after input fails with the Proxy as the cause', async (context) => {
  vi.useFakeTimers()
  const {proxy, revoke} = Proxy.revocable({}, {})
  revoke()
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: proxy},
    {rejectedTap: 2, error: proxy},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isError: error instanceof Error,
    message: (error as Error).message,
    isCause: (error as Error).cause === proxy,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isError: true,
    message: [
      '<thrown value that cannot be converted to text>',
      'Steps:',
      "  1. backspace: failed (<thrown value that cannot be converted to text>), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
    state: 'inconclusive',
  })
})

test('Scenario: An abort reason whose `toString` throws is the error of a call aborted during the retry', async (context) => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const reason = {
    toString: () => {
      throw new Error('toString failed')
    },
  }
  globalThis.attemptFaults = [
    {failingBoundary: 1},
    {failingBoundary: 1, abort: controller, error: reason},
  ]
  const running = runOnDevice(
    {...context, signal: controller.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'backspace'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isReason: error === reason,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isReason: true,
    state: 'aborted',
  })
})

test('Scenario: An abort reason whose `message` is a Symbol is the error of a call aborted during the retry', async (context) => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const reason = Object.defineProperty(new Error('timed out'), 'message', {
    get: () => Symbol('timed out'),
  })
  globalThis.attemptFaults = [
    {failingBoundary: 1},
    {failingBoundary: 1, abort: controller, error: reason},
  ]
  const running = runOnDevice(
    {...context, signal: controller.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'backspace'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isReason: error === reason,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isReason: true,
    state: 'aborted',
  })
})

test('Scenario: A step whose `toJSON` throws fails with the step error and the records', async (context) => {
  vi.useFakeTimers()
  const tapFailed = new Error('tap failed')
  const step = {
    type: 'backspace' as const,
    toJSON: () => {
      throw new Error('toJSON failed')
    },
  }
  globalThis.attemptFaults = [
    {rejectedTap: 2, error: tapFailed},
    {rejectedTap: 2, error: tapFailed},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [step],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    message: (error as Error).message,
    isCause: (error as Error).cause === tapFailed,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    message: [
      'tap failed',
      'Steps:',
      "  1. backspace: failed (Error: tap failed), textAfter 'fo', keys Delete",
    ].join('\n'),
    isCause: true,
    state: 'inconclusive',
  })
})

test('Scenario: The page throws after a step whose `toJSON` throws, ending the call without a retry', async (context) => {
  vi.useFakeTimers()
  const step = {
    type: 'backspace' as const,
    toJSON: () => {
      throw new Error('toJSON failed')
    },
  }
  globalThis.attemptFaults = [
    {failingBoundary: 2, boundaryError: 'page'},
    {failingBoundary: 2, boundaryError: 'page'},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [step],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isPageException: (error as Error).cause instanceof PageExceptionError,
    message: (error as Error).message,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isPageException: true,
    message: [
      'Uncaught in `window.__state()`: Error: getSnapshot failed',
      'Steps:',
      "  1. backspace: failed (PageExceptionError: Uncaught in `window.__state()`: Error: getSnapshot failed), textAfter 'f', keys Delete",
    ].join('\n'),
    state: 'page-exception',
  })
})

test('Scenario: The page throws after a step whose `toJSON` throws only once, and the call is not retried into a success', async (context) => {
  vi.useFakeTimers()
  let conversions = 0
  const step = {
    type: 'backspace' as const,
    toJSON: () => {
      conversions += 1
      if (conversions === 1) {
        throw new Error('toJSON failed')
      }
      return {type: 'backspace'}
    },
  }
  globalThis.attemptFaults = [{failingBoundary: 2, boundaryError: 'page'}]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [step],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    isPageException: (error as Error).cause instanceof PageExceptionError,
    state: driverRuns.at(-1)?.state,
  }).toEqual({
    isPageException: true,
    state: 'page-exception',
  })
})
