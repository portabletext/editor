import {beforeEach, expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test('Scenario: A page exception in the read of a step that failed before input ends the call on it', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.pageExceptionReads = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'compose', text: '-', commit: 'none'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: String(error.cause),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    cause: 'Error: injected tap 2 was rejected',
    run: {
      test: 'Scenario: A page exception in the read of a step that failed before input ends the call on it',
      fails: false,
      state: 'page-exception',
      pageException:
        'Uncaught in `window.__state()`: Error: getSnapshot failed',
    },
    attempts: ['attempt 1'],
  })
})

test('Scenario: A page exception in the read of a step that failed on the retry ends the call on it', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2, 2]
  globalThis.gboardDevice.pageExceptionReads = [undefined, 2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'compose', text: '-', commit: 'none'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: String(error.cause),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    cause: 'Error: injected tap 2 was rejected',
    run: {
      test: 'Scenario: A page exception in the read of a step that failed on the retry ends the call on it',
      fails: false,
      state: 'page-exception',
      pageException:
        'Uncaught in `window.__state()`: Error: getSnapshot failed',
    },
    attempts: ['attempt 1', 'attempt 2'],
  })
})

test('Scenario: A page exception in the read of a step that failed after input ends the call on it, not inconclusive', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.pageExceptionReads = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: String(error.cause),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    cause: 'Error: injected tap 2 was rejected',
    run: {
      test: 'Scenario: A page exception in the read of a step that failed after input ends the call on it, not inconclusive',
      fails: false,
      state: 'page-exception',
      pageException:
        'Uncaught in `window.__state()`: Error: getSnapshot failed',
    },
    attempts: ['attempt 1'],
  })
})

test('Scenario: Another error in the read of a failed step stays a diagnostic, and the call still retries', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.lostReads = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'compose', text: '-', commit: 'none'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    run,
    driver: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    run: {
      steps: [
        {
          type: 'compose',
          status: 'done',
          textAfter: 'foo-',
          selectionAfter: {anchor: 4, focus: 4},
          focusedAfter: true,
          events: [],
        },
      ],
      text: 'foo-',
      selection: {anchor: 4, focus: 4},
      events: [],
    },
    driver: {
      test: 'Scenario: Another error in the read of a failed step stays a diagnostic, and the call still retries',
      fails: false,
      state: 'complete',
    },
    attempts: ['attempt 1', 'attempt 2'],
  })
})
