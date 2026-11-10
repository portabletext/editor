import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {beforeEach, expect, test, vi} from 'vitest'
import {AdbError, CommandError} from '../../device/adb.ts'
import {driverRuns, runOnDevice} from '../../driver.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test("Scenario: Each step's record holds whether the field has focus, read in the same evaluation as its text and selection", async (context) => {
  globalThis.gboardDevice.blurringTaps = [3]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    steps: run.steps,
    evaluations: globalThis.gboardDevice.evaluations,
  }).toEqual({
    steps: [
      {
        type: 'backspace',
        status: 'done',
        textAfter: 'fo',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        keys: ['Delete'],
        events: [],
      },
      {
        type: 'enter',
        status: 'done',
        textAfter: 'fo\n',
        selectionAfter: {anchor: 3, focus: 3},
        focusedAfter: false,
        keys: ['Enter'],
        events: [],
      },
    ],
    evaluations: ['focused', 'focused', 'boundary', 'boundary', 'boundary'],
  })
})

test("Scenario: After a step fails, the page's text, selection and focus are read into its record, and the error is the step's", async (context) => {
  globalThis.gboardDevice.rejectedTaps = [3]
  globalThis.gboardDevice.rejectedTapLands = true
  globalThis.gboardDevice.blurringTaps = [3]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}, {type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    cause: String(error.cause),
    records: artifactRecords(
      'en-after-a-step-fails-the-page-s-text-selection-and-focus-are-read-into-its-record-and-the-error-is-the-step-s',
    ),
  }).toEqual({
    message: [
      'injected tap 3 was rejected',
      'Steps:',
      "  1. backspace: done, textAfter 'fo', keys Delete",
      "  2. enter: failed (Error: injected tap 3 was rejected), textAfter 'fo\\n', keys Enter",
      '  3. backspace: skipped (step 2 failed), textAfter None, keys none',
    ].join('\n'),
    cause: 'Error: injected tap 3 was rejected',
    records: [
      {
        type: 'backspace',
        status: 'done',
        textAfter: 'fo',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        keys: ['Delete'],
        events: [],
      },
      {
        type: 'enter',
        status: 'failed',
        reason: 'Error: injected tap 3 was rejected',
        textAfter: 'fo\n',
        selectionAfter: {anchor: 3, focus: 3},
        focusedAfter: false,
        keys: ['Enter'],
        events: [],
      },
      {
        type: 'backspace',
        status: 'skipped',
        reason: 'step 2 failed',
        textAfter: null,
        selectionAfter: null,
        focusedAfter: null,
        keys: [],
        events: [],
      },
    ],
  })
})

test("Scenario: The page is read into the failed step's record after the attempt timed out, on a clock of its own", async (context) => {
  globalThis.gboardDevice.hungTaps = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    records: artifactRecords(
      'en-the-page-is-read-into-the-failed-step-s-record-after-the-attempt-timed-out-on-a-clock-of-its-own',
    ),
  }).toEqual({
    message: [
      'attempt en-the-page-is-read-into-the-failed-step-s-record-after-the-attempt-timed-out-on-a-clock-of-its-own timed out after 180s',
      'Steps:',
      "  1. enter: failed (DeadlineError: attempt en-the-page-is-read-into-the-failed-step-s-record-after-the-attempt-timed-out-on-a-clock-of-its-own timed out after 180s), textAfter 'foo\\n', keys Enter",
    ].join('\n'),
    records: [
      {
        type: 'enter',
        status: 'failed',
        reason:
          'DeadlineError: attempt en-the-page-is-read-into-the-failed-step-s-record-after-the-attempt-timed-out-on-a-clock-of-its-own timed out after 180s',
        textAfter: 'foo\n',
        selectionAfter: {anchor: 4, focus: 4},
        focusedAfter: true,
        keys: ['Enter'],
        events: [],
      },
    ],
  })
})

test("Scenario: A read after the failed step that does not answer leaves its text, selection and focus unread, and the error is the step's", async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.hungReads = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    cause: String(error.cause),
    run: driverRuns.at(-1),
    records: artifactRecords(
      'en-a-read-after-the-failed-step-that-does-not-answer-leaves-its-text-selection-and-focus-unread-and-the-error-is-the-step-s',
    ),
  }).toEqual({
    message: [
      'injected tap 2 was rejected',
      'Steps:',
      '  1. enter: failed (Error: injected tap 2 was rejected), textAfter None, keys Enter',
    ].join('\n'),
    cause: 'Error: injected tap 2 was rejected',
    run: {
      test: "Scenario: A read after the failed step that does not answer leaves its text, selection and focus unread, and the error is the step's",
      fails: false,
      state: 'inconclusive',
      taps: [{keys: ['Enter'], events: []}],
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    records: [
      {
        type: 'enter',
        status: 'failed',
        reason: 'Error: injected tap 2 was rejected',
        textAfter: null,
        selectionAfter: null,
        focusedAfter: null,
        keys: ['Enter'],
        events: [],
      },
    ],
  })
})

test("Scenario: A failed step read back before the test's deadline ends the call inconclusive", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.rejectedTaps = [2]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: String(error.cause),
    run: driverRuns.at(-1),
    records: artifactRecords(
      'en-a-failed-step-read-back-before-the-test-s-deadline-ends-the-call-inconclusive',
    ),
  }).toEqual({
    cause: 'Error: injected tap 2 was rejected',
    run: {
      test: "Scenario: A failed step read back before the test's deadline ends the call inconclusive",
      fails: false,
      state: 'inconclusive',
      taps: [{keys: ['Enter'], events: []}],
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    records: [
      {
        type: 'enter',
        status: 'failed',
        reason: 'Error: injected tap 2 was rejected',
        textAfter: 'foo',
        selectionAfter: {anchor: 3, focus: 3},
        focusedAfter: true,
        keys: ['Enter'],
        events: [],
      },
    ],
  })
})

test("Scenario: A failed step whose read back is still running at the test's deadline ends the call inconclusive, and the read is stopped", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.hungReads = [2]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: String(error.cause),
    run: driverRuns.at(-1),
    records: artifactRecords(
      'en-a-failed-step-whose-read-back-is-still-running-at-the-test-s-deadline-ends-the-call-inconclusive-and-the-read-is-stopped',
    ),
  }).toEqual({
    cause: 'Error: injected tap 2 was rejected',
    run: {
      test: "Scenario: A failed step whose read back is still running at the test's deadline ends the call inconclusive, and the read is stopped",
      fails: false,
      state: 'inconclusive',
      taps: [{keys: ['Enter'], events: []}],
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    records: [
      {
        type: 'enter',
        status: 'failed',
        reason: 'Error: injected tap 2 was rejected',
        textAfter: null,
        selectionAfter: null,
        focusedAfter: null,
        keys: ['Enter'],
        events: [],
      },
    ],
  })
})

test("Scenario: The test's deadline during a step that still runs ends the call aborted", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.hungTaps = [2]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    error: String(error),
    run: driverRuns.at(-1),
  }).toEqual({
    error: [
      'Error: test deadline',
      'Steps:',
      '  1. enter: failed (Error: test deadline), textAfter None, keys Enter',
    ].join('\n'),
    run: {
      test: "Scenario: The test's deadline during a step that still runs ends the call aborted",
      fails: false,
      state: 'aborted',
      taps: [{keys: ['Enter'], events: []}],
    },
  })
})

test("Scenario: A tap that times out after input, with the state read answered before the test's deadline, ends the call inconclusive and answered", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  const fault = new CommandError('adb shell input tap timed out after 15s')
  fault.timedOut = true
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause: 'CommandError: adb shell input tap timed out after 15s',
      run: {
        test: "Scenario: A tap that times out after input, with the state read answered before the test's deadline, ends the call inconclusive and answered",
        fails: false,
        state: 'inconclusive',
        taps: [{keys: ['Enter'], events: []}],
        reason: 'the driver faulted after it sent input, so it was not retried',
        deviceAnswered: true,
      },
    },
  )
})

test("Scenario: A tap that times out after input, with the state read still running at the test's deadline, ends the call inconclusive and unconfirmed", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  const fault = new CommandError('adb shell input tap timed out after 15s')
  fault.timedOut = true
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause: 'CommandError: adb shell input tap timed out after 15s',
      run: {
        test: "Scenario: A tap that times out after input, with the state read still running at the test's deadline, ends the call inconclusive and unconfirmed",
        fails: false,
        state: 'inconclusive',
        taps: [{keys: ['Enter'], events: []}],
        reason: 'the driver faulted after it sent input, so it was not retried',
        deviceUnconfirmed: true,
      },
    },
  )
})

test("Scenario: A pid read that times out, with the state read answered before the test's deadline, ends the call inconclusive and answered", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 12_000)
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause: 'Error: read 1 of the page failed',
      run: {
        test: "Scenario: A pid read that times out, with the state read answered before the test's deadline, ends the call inconclusive and answered",
        fails: false,
        state: 'inconclusive',
        reason: expect.stringMatching(
          /^the restart before the retry did not show a fresh Chrome: adb timed out during the Chrome restart: /,
        ),
        deviceAnswered: true,
      },
    },
  )
})

test("Scenario: A pid read that times out, with the state read still running at the test's deadline, ends the call inconclusive and unconfirmed", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 12_000)
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause: 'Error: read 1 of the page failed',
      run: {
        test: "Scenario: A pid read that times out, with the state read still running at the test's deadline, ends the call inconclusive and unconfirmed",
        fails: false,
        state: 'inconclusive',
        reason: expect.stringMatching(
          /^the restart before the retry did not show a fresh Chrome: adb timed out during the Chrome restart: /,
        ),
        deviceUnconfirmed: true,
      },
    },
  )
})

test("Scenario: A rejected tap after input, with the failure dump done before the test's deadline, ends the call inconclusive", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.rejectedTaps = [2]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause: 'Error: injected tap 2 was rejected',
      run: {
        test: "Scenario: A rejected tap after input, with the failure dump done before the test's deadline, ends the call inconclusive",
        fails: false,
        state: 'inconclusive',
        taps: [{keys: ['Enter'], events: []}],
        reason: 'the driver faulted after it sent input, so it was not retried',
      },
    },
  )
})

test("Scenario: A rejected tap after input, with the failure dump still running at the test's deadline, ends the call inconclusive", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.hungDumpsAfterTap = [2]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause: 'Error: injected tap 2 was rejected',
      run: {
        test: "Scenario: A rejected tap after input, with the failure dump still running at the test's deadline, ends the call inconclusive",
        fails: false,
        state: 'inconclusive',
        taps: [{keys: ['Enter'], events: []}],
        reason: 'the driver faulted after it sent input, so it was not retried',
      },
    },
  )
})

test("Scenario: An exception in the page, with the read of the page done before the test's deadline, ends the call on the page's exception", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.pageExceptionReads = [2]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause:
        'PageExceptionError: Uncaught in `window.__state()`: Error: getSnapshot failed',
      run: {
        test: "Scenario: An exception in the page, with the read of the page done before the test's deadline, ends the call on the page's exception",
        fails: false,
        state: 'page-exception',
        taps: [{keys: ['Enter'], events: []}],
        pageException:
          'Uncaught in `window.__state()`: Error: getSnapshot failed',
      },
    },
  )
})

test("Scenario: An exception in the page, with the read of the page still running at the test's deadline, ends the call on the page's exception", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  globalThis.gboardDevice.pageExceptionReads = [2]
  globalThis.gboardDevice.hungReads = [3]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: String(error.cause ?? error), run: driverRuns.at(-1)}).toEqual(
    {
      cause:
        'PageExceptionError: Uncaught in `window.__state()`: Error: getSnapshot failed',
      run: {
        test: "Scenario: An exception in the page, with the read of the page still running at the test's deadline, ends the call on the page's exception",
        fails: false,
        state: 'page-exception',
        taps: [{keys: ['Enter'], events: []}],
        pageException:
          'Uncaught in `window.__state()`: Error: getSnapshot failed',
      },
    },
  )
})

test('Scenario: The outcome of a failed attempt is recorded before any diagnostic, so one that never answers changes nothing', async (context) => {
  const deadline = new AbortController()
  // The deadline falls once the tap failed, while the first diagnostic of any kind waits.
  setTimeout(() => deadline.abort(new Error('test deadline')), 10_000)
  const fault = new CommandError('adb shell input tap timed out after 15s')
  fault.timedOut = true
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.hungDumpsAfterTap = [2]
  globalThis.gboardDevice.hungReads = [2]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({cause: error.cause, run: driverRuns.at(-1)}).toEqual({
    cause: fault,
    run: {
      test: 'Scenario: The outcome of a failed attempt is recorded before any diagnostic, so one that never answers changes nothing',
      fails: false,
      state: 'inconclusive',
      taps: [{keys: ['Enter'], events: []}],
      reason: 'the driver faulted after it sent input, so it was not retried',
      deviceUnconfirmed: true,
    },
  })
})

test("Scenario: A tap that fails on adb's error for a lost device, from adb's CLI, ends the call device offline from that error alone, with the state read hanging at the test's deadline", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  const fault = new CommandError(
    'adb shell input tap exited with 1: error: device offline',
  )
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: A tap that fails on adb's error for a lost device, from adb's CLI, ends the call device offline from that error alone, with the state read hanging at the test's deadline",
      fails: false,
      state: 'device-offline',
      taps: [{keys: ['Enter'], events: []}],
      reason:
        'adb lost the device, so it was not retried: adb shell input tap exited with 1: error: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter rejected',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A tap that fails on adb's error for a lost device, from adb's CLI, ends the call device offline from that error alone, with the failure dump hanging at the test's deadline", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  const fault = new CommandError(
    'adb shell input tap exited with 1: error: device offline',
  )
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.hungDumpsAfterTap = [2]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: A tap that fails on adb's error for a lost device, from adb's CLI, ends the call device offline from that error alone, with the failure dump hanging at the test's deadline",
      fails: false,
      state: 'device-offline',
      taps: [{keys: ['Enter'], events: []}],
      reason:
        'adb lost the device, so it was not retried: adb shell input tap exited with 1: error: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter rejected',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A tap that fails on adb's error for a lost device, from the adb server's `FAIL`, ends the call device offline from that error alone, with the state read hanging at the test's deadline", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  const fault = new AdbError('device offline')
  fault.serverFailed = true
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: A tap that fails on adb's error for a lost device, from the adb server's `FAIL`, ends the call device offline from that error alone, with the state read hanging at the test's deadline",
      fails: false,
      state: 'device-offline',
      taps: [{keys: ['Enter'], events: []}],
      reason:
        'adb lost the device, so it was not retried: the adb server answered FAIL: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter rejected',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A tap that fails on adb's error for a lost device, from the adb server's `FAIL`, ends the call device offline from that error alone, with the failure dump hanging at the test's deadline", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  const fault = new AdbError('device offline')
  fault.serverFailed = true
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.hungDumpsAfterTap = [2]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: A tap that fails on adb's error for a lost device, from the adb server's `FAIL`, ends the call device offline from that error alone, with the failure dump hanging at the test's deadline",
      fails: false,
      state: 'device-offline',
      taps: [{keys: ['Enter'], events: []}],
      reason:
        'adb lost the device, so it was not retried: the adb server answered FAIL: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter rejected',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A timeout before any input, with the state read still running at the test's deadline before the retry, ends the call inconclusive and unconfirmed", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 37_000)
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    error: 'CommandError: adb shell dumpsys input_method timed out after 30s',
    run: {
      test: "Scenario: A timeout before any input, with the state read still running at the test's deadline before the retry, ends the call inconclusive and unconfirmed",
      fails: false,
      state: 'inconclusive',
      reason:
        'the test timed out while the driver decided whether to retry a timeout before any input: CommandError: adb shell dumpsys input_method timed out after 30s',
      deviceUnconfirmed: true,
    },
    attempts: ['attempt 1'],
  })
})

test("Scenario: A timeout before any input, with the failure dump still running at the test's deadline before the retry, ends the call inconclusive and unconfirmed", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 37_000)
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.hungDumpsAfterTap = [1]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    error: 'CommandError: adb shell dumpsys input_method timed out after 30s',
    run: {
      test: "Scenario: A timeout before any input, with the failure dump still running at the test's deadline before the retry, ends the call inconclusive and unconfirmed",
      fails: false,
      state: 'inconclusive',
      reason:
        'the test timed out while the driver decided whether to retry a timeout before any input: CommandError: adb shell dumpsys input_method timed out after 30s',
      deviceUnconfirmed: true,
    },
    attempts: ['attempt 1'],
  })
})

test("Scenario: A timeout before any input, with the state read answering device before the test's deadline, retries, and the deadline during the retry's restart ends the call aborted", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 37_000)
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = {stdout: 'device\n', stderr: '', code: 0}
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect({
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    run: {
      test: "Scenario: A timeout before any input, with the state read answering device before the test's deadline, retries, and the deadline during the retry's restart ends the call aborted",
      fails: false,
      state: 'aborted',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'shell dumpsys input_method',
      'get-state',
      'pidof chrome',
      'force-stop chrome',
      'pidof chrome',
      'open chrome',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A timeout before any input, with the state read answering offline before the test's deadline, ends the call device offline", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 37_000)
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = {stdout: 'offline\n', stderr: '', code: 0}
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect({
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    run: {
      test: "Scenario: A timeout before any input, with the state read answering offline before the test's deadline, ends the call device offline",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device (adb get-state: offline), so it was not retried',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'shell dumpsys input_method',
      'get-state',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A rejected tap before any input, with the failure dump still running at the test's deadline before the retry, ends the call on a driver fault", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 7_000)
  globalThis.gboardDevice.rejectedTaps = [1]
  globalThis.gboardDevice.hungDumpsAfterTap = [1]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: 'Error: injected tap 1 was rejected',
    run: {
      test: "Scenario: A rejected tap before any input, with the failure dump still running at the test's deadline before the retry, ends the call on a driver fault",
      fails: false,
      state: 'faulted',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field rejected',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A retry that refuses a Chrome that did not restart still ends the call on the first attempt's step records", async (context) => {
  globalThis.gboardDevice.rejectedDumpsFrom = [4]
  globalThis.gboardDevice.nextPid = 100
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    message: [
      'injected dump was rejected',
      'Steps:',
      "  1. enter: failed (Error: injected dump was rejected), textAfter 'foo', keys none",
    ].join('\n'),
    run: {
      test: "Scenario: A retry that refuses a Chrome that did not restart still ends the call on the first attempt's step records",
      fails: false,
      state: 'inconclusive',
      reason: expect.stringMatching(
        /^the restart before the retry did not show a fresh Chrome: the relaunched Chrome runs in the old process/,
      ),
    },
    attempts: ['attempt 1'],
  })
})

test("Scenario: A retry whose own step fails ends the call on its own step records, not the first attempt's", async (context) => {
  globalThis.gboardDevice.rejectedDumpsFrom = [4]
  globalThis.gboardDevice.rejectedTaps = [undefined, 2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    message: [
      'injected tap 2 was rejected',
      'Steps:',
      "  1. enter: failed (Error: injected tap 2 was rejected), textAfter 'foo', keys Enter",
    ].join('\n'),
    attempts: ['attempt 1', 'attempt 2'],
  })
})

test("Scenario: A rejected tap before any input, with the failure dump done before the test's deadline, is retried and the call completes", async (context) => {
  const deadline = new AbortController()
  setTimeout(() => deadline.abort(new Error('test deadline')), 600_000)
  globalThis.gboardDevice.rejectedTaps = [1]
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  )
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'foo\n',
    run: {
      test: "Scenario: A rejected tap before any input, with the failure dump done before the test's deadline, is retried and the call completes",
      fails: false,
      state: 'complete',
      taps: [{keys: ['Enter'], events: []}],
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field rejected',
      'pidof chrome',
      'force-stop chrome',
      'pidof chrome',
      'open chrome',
      'pidof chrome',
      'attempt 2',
      'tap field',
      'tap Enter',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A test deadline that reading adb's lost-device error itself aborts still ends the call device offline, since the failure was already being classified", async (context) => {
  const deadline = new AbortController()
  const fault = new CommandError('adb shell input tap exited with 1')
  Object.defineProperty(fault, 'message', {
    get() {
      if (new Error().stack?.includes('terminalOutcome')) {
        // The deadline falls while the driver classifies the failure, not while it records the step.
        deadline.abort(new Error('test deadline'))
      }
      return 'adb shell input tap exited with 1: error: device offline'
    },
  })
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = fault
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: A test deadline that reading adb's lost-device error itself aborts still ends the call device offline, since the failure was already being classified",
      fails: false,
      state: 'device-offline',
      taps: [{keys: ['Enter'], events: []}],
      reason:
        'adb lost the device, so it was not retried: adb shell input tap exited with 1: error: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter rejected',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A test deadline that reading a pre-input timeout itself aborts ends the call inconclusive and unconfirmed, since the failure was already being classified', async (context) => {
  const deadline = new AbortController()
  const fault = new CommandError('adb shell input tap timed out after 15s')
  Object.defineProperty(fault, 'timedOut', {
    get() {
      if (new Error().stack?.includes('terminalOutcome')) {
        // The deadline falls while the driver classifies the failure, not while it records the step.
        deadline.abort(new Error('test deadline'))
      }
      return true
    },
  })
  globalThis.gboardDevice.rejectedTaps = [1]
  globalThis.gboardDevice.rejectedTapError = fault
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: fault,
    run: {
      test: 'Scenario: A test deadline that reading a pre-input timeout itself aborts ends the call inconclusive and unconfirmed, since the failure was already being classified',
      fails: false,
      state: 'inconclusive',
      reason:
        'the test timed out while the driver decided whether to retry a timeout before any input: CommandError: adb shell input tap timed out after 15s',
      deviceUnconfirmed: true,
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field rejected',
      'force-stop chrome',
    ],
  })
})

test('Scenario: No diagnostic read sits between two inputs', async (context) => {
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [
      {type: 'backspace', times: 2},
      {type: 'compose', text: 'ab', commit: 'none'},
      {type: 'enter'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    calls: globalThis.gboardDevice.calls,
    evaluations: globalThis.gboardDevice.evaluations,
  }).toEqual({
    text: 'fab\n',
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Delete',
      'tap Delete',
      'tap A',
      'tap B',
      'tap Enter',
      'force-stop chrome',
    ],
    evaluations: [
      'focused',
      'focused',
      'boundary',
      'boundary',
      'state',
      'boundary',
      'boundary',
    ],
  })
})

test('Scenario: A candidate Gboard offers is tapped', async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  globalThis.gboardDevice.candidate = '今日'
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: '今日',
    taps: ['tap field', 'tap k', 'tap y', 'tap o', 'tap u', 'tap 今日'],
  })
})

test('Scenario: A candidate Gboard does not offer fails the step instead of committing with Space', async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
      {type: 'enter'},
    ],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    run: driverRuns.at(-1),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    message: expect.stringMatching(
      /^Gboard did not offer the candidate '今日' in step 1, candidates \[.*'きょう'.*\]\nSteps:\n {2}1\. compose: failed \(Error: Gboard did not offer the candidate '今日' in step 1, .*\), textAfter 'kyou', keys k y o u\n {2}2\. enter: skipped \(step 1 failed\), textAfter None, keys none$/,
    ),
    run: {
      test: 'Scenario: A candidate Gboard does not offer fails the step instead of committing with Space',
      fails: false,
      state: 'inconclusive',
      taps: [{keys: ['k', 'y', 'o', 'u'], events: []}],
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    taps: ['tap field', 'tap k', 'tap y', 'tap o', 'tap u'],
  })
})

test("Scenario: '- ' in English text is typed on Gboard's symbol layout, which the step leaves for the letters again", async (context) => {
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', text: '- ', commit: 'none'},
      {type: 'compose', text: 'ab', commit: 'none'},
      {type: 'enter'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    steps: run.steps.map((record) => record.textAfter),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: '- ab\n',
    steps: ['- ', '- ab', '- ab\n'],
    taps: [
      'tap field',
      'tap Symbol keyboard',
      'tap Dash',
      'tap Space',
      'tap A',
      'tap B',
      'tap Enter',
    ],
  })
})

test("Scenario: ' -' in English text is typed in its order, reopening the symbol layout for the dash after a space, since Space returns Gboard to the letters", async (context) => {
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', text: ' -', commit: 'none'},
      {type: 'compose', text: 'k', commit: 'none'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    steps: run.steps.map((record) => record.status),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: ' -k',
    steps: ['done', 'done'],
    taps: [
      'tap field',
      'tap Symbol keyboard',
      'tap Space',
      'tap Symbol keyboard',
      'tap Dash',
      'tap Letter keyboard',
      'tap K',
    ],
  })
})

test("Scenario: '- ' in Japanese text is typed through the alphabet layout, the numeric pad and its 記号キーボード, which the step leaves for romaji again", async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: '- ', commit: 'none'}, {type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: '- \n',
    taps: [
      'tap field',
      'tap アルファベット入力キーボード',
      'tap 数字キーボード',
      'tap 記号キーボード',
      'tap ダッシュ',
      'tap 文字キーボード',
      'tap スペース',
      'tap かな入力キーボード',
      'tap Enter',
    ],
  })
})

test("Scenario: ' -' in Japanese text is typed in its order, reopening 記号キーボード from the numeric pad for each dash after a space, and the step ends on romaji", async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', text: ' -', commit: 'none'},
      {type: 'compose', letters: 'k', commit: 'none'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    steps: run.steps.map((record) => record.status),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: ' -k',
    steps: ['done', 'done'],
    taps: [
      'tap field',
      'tap アルファベット入力キーボード',
      'tap 数字キーボード',
      'tap スペース',
      'tap 記号キーボード',
      'tap ダッシュ',
      'tap 文字キーボード',
      'tap かな入力キーボード',
      'tap k',
    ],
  })
})

test("Scenario: '- -' in Japanese text is typed in its order, reopening 記号キーボード from the numeric pad for each dash after a space, and the step ends on romaji", async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', text: '- -', commit: 'none'},
      {type: 'compose', letters: 'k', commit: 'none'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    steps: run.steps.map((record) => record.status),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: '- -k',
    steps: ['done', 'done'],
    taps: [
      'tap field',
      'tap アルファベット入力キーボード',
      'tap 数字キーボード',
      'tap 記号キーボード',
      'tap ダッシュ',
      'tap 文字キーボード',
      'tap スペース',
      'tap 記号キーボード',
      'tap ダッシュ',
      'tap 文字キーボード',
      'tap かな入力キーボード',
      'tap k',
    ],
  })
})

test("Scenario: '-  ' in Japanese text types both spaces on the numeric pad after the dash, and the step ends on romaji", async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', text: '-  ', commit: 'none'},
      {type: 'compose', letters: 'k', commit: 'none'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    steps: run.steps.map((record) => record.status),
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: '-  k',
    steps: ['done', 'done'],
    taps: [
      'tap field',
      'tap アルファベット入力キーボード',
      'tap 数字キーボード',
      'tap 記号キーボード',
      'tap ダッシュ',
      'tap 文字キーボード',
      'tap スペース',
      'tap スペース',
      'tap かな入力キーボード',
      'tap k',
    ],
  })
})

test("Scenario: ' ' in Japanese text is tapped on the numeric pad even when the dump after 数字キーボード still shows the alphabet layout", async (context) => {
  globalThis.gboardDevice.keyboard = 'ja'
  globalThis.gboardDevice.laggingLayoutDump = true
  const running = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: ' ', commit: 'none'}, {type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: ' \n',
    taps: [
      'tap field',
      'tap アルファベット入力キーボード',
      'tap 数字キーボード',
      'tap スペース',
      'tap かな入力キーボード',
      'tap Enter',
    ],
  })
})

test("Scenario: ' ' in English text is tapped on the symbol layout even when the dump after Symbol keyboard still shows the letters", async (context) => {
  globalThis.gboardDevice.laggingLayoutDump = true
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: ' ', commit: 'none'}, {type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    taps: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('tap'),
    ),
  }).toEqual({
    text: ' \n',
    taps: ['tap field', 'tap Symbol keyboard', 'tap Space', 'tap Enter'],
  })
})

function artifactRecords(name: string): unknown {
  return JSON.parse(
    readFileSync(join(process.env.THUMBJAR_OUT_DIR!, `${name}.json`), 'utf8'),
  ).records
}
