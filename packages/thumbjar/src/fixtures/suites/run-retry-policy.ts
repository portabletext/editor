import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {beforeEach, expect, test, vi} from 'vitest'
import {AdbError, CommandError, DeviceLost} from '../../device/adb.ts'
import {HTTPError} from '../../device/u2.ts'
import {driverRuns, runOnDevice, typeOnDevice} from '../../driver.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test('Scenario: A fault before any input is retried once the old Chrome stopped and the new one runs in another process', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'foo\n',
    run: {
      test: 'Scenario: A fault before any input is retried once the old Chrome stopped and the new one runs in another process',
      fails: false,
      state: 'complete',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
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

test('Scenario: A fault before any input is not retried when the old Chrome still runs after the force-stop', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.forceStopStops = false
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    error: 'Error: read 1 of the page failed',
    run: {
      test: 'Scenario: A fault before any input is not retried when the old Chrome still runs after the force-stop',
      fails: false,
      state: 'inconclusive',
      reason: expect.stringMatching(
        /^the restart before the retry did not show a fresh Chrome: the old Chrome still ran \d+s after the force-stop, old pid 100, new pid 100$/,
      ),
    },
    attempts: ['attempt 1'],
  })
})

test('Scenario: A fault before any input is not retried when the relaunched Chrome runs in the old process', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.nextPid = 100
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: 'Error: read 1 of the page failed',
    run: {
      test: 'Scenario: A fault before any input is not retried when the relaunched Chrome runs in the old process',
      fails: false,
      state: 'inconclusive',
      reason:
        'the restart before the retry did not show a fresh Chrome: the relaunched Chrome runs in the old process, old pid 100, new pid 100',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'pidof chrome',
      'force-stop chrome',
      'pidof chrome',
      'open chrome',
      'pidof chrome',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A fault before any input is not retried when the pid of the old Chrome cannot be read', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {
      match: /pidof com\.android\.chrome/,
      answer: {
        stdout: '',
        stderr: '/system/bin/sh: pidof: inaccessible\n',
        code: 126,
      },
    },
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: 'Error: read 1 of the page failed',
    run: {
      test: 'Scenario: A fault before any input is not retried when the pid of the old Chrome cannot be read',
      fails: false,
      state: 'inconclusive',
      reason: expect.stringMatching(
        /^the restart before the retry did not show a fresh Chrome: adb shell pidof com\.android\.chrome failed before the restart: .*inaccessible/,
      ),
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'pidof chrome',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A fault after a key tap is inconclusive and never retried, and keeps its error and records', async (context) => {
  globalThis.gboardDevice.lostReads = [3]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    message: error.message,
    cause: String(error.cause),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    message: [
      'read 3 of the page failed',
      'Steps:',
      "  1. backspace: done, textAfter 'fo'",
      '  2. enter: failed (Error: read 3 of the page failed), textAfter None',
    ].join('\n'),
    cause: 'Error: read 3 of the page failed',
    run: {
      test: 'Scenario: A fault after a key tap is inconclusive and never retried, and keeps its error and records',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Delete',
      'tap Enter',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A fault right after a Delete tap is inconclusive, since Delete changes the field', async (context) => {
  globalThis.gboardDevice.lostReads = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: String(error.cause),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: 'Error: read 2 of the page failed',
    run: {
      test: 'Scenario: A fault right after a Delete tap is inconclusive, since Delete changes the field',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Delete',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A key tap whose reply was rejected counts as sent input, so its fault is never retried', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapLands = true
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
      test: 'Scenario: A key tap whose reply was rejected counts as sent input, so its fault is never retried',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    attempts: ['attempt 1'],
  })
})

test('Scenario: A key tap the device never answers counts as sent input, so the attempt timing out is never retried', async (context) => {
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
    cause: String(error.cause),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
  }).toEqual({
    cause:
      'DeadlineError: attempt en-a-key-tap-the-device-never-answers-counts-as-sent-input-so-the-attempt-timing-out-is-never-retried timed out after 180s',
    run: {
      test: 'Scenario: A key tap the device never answers counts as sent input, so the attempt timing out is never retried',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
    },
    attempts: ['attempt 1'],
  })
})

test("Scenario: An adb call that fails on adb's error for a lost device ends the call device offline without a retry", async (context) => {
  globalThis.gboardDevice.adbAnswers = [
    {
      match: /dumpsys input_method/,
      answer: {stdout: '', stderr: 'error: device offline\n', code: 1},
    },
  ]
  globalThis.gboardDevice.getState = {
    stdout: '',
    stderr: 'error: device offline\n',
    code: 1,
  }
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error:
      'CommandError: adb shell dumpsys input_method exited with 1: error: device offline',
    run: {
      test: "Scenario: An adb call that fails on adb's error for a lost device ends the call device offline without a retry",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell dumpsys input_method exited with 1: error: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'shell dumpsys input_method',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A tap the adb server answers with `FAIL device offline` ends the call device offline, like the CLI's error", async (context) => {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
  globalThis.gboardDevice.getState = {stdout: 'offline\n', stderr: '', code: 0}
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
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause:
      'HTTPError: Unable to connect to uiautomator2 server: device offline',
    run: {
      test: "Scenario: A tap the adb server answers with `FAIL device offline` ends the call device offline, like the CLI's error",
      fails: false,
      state: 'device-offline',
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

test('Scenario: A tap whose socket to the adb server closed is no lost device, and after input it ends the call inconclusive', async (context) => {
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = new HTTPError(
    'Unable to connect to uiautomator2 server: connection closed',
    {cause: new AdbError('connection closed')},
  )
  globalThis.gboardDevice.getState = {stdout: 'offline\n', stderr: '', code: 0}
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect({
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    run: {
      test: 'Scenario: A tap whose socket to the adb server closed is no lost device, and after input it ends the call inconclusive',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
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

test("Scenario: The pid read failing on adb's error for a lost device ends the call device offline", async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {
      match: /pidof com\.android\.chrome/,
      answer: {stdout: '', stderr: 'adb: device offline\n', code: 1},
    },
  ]
  globalThis.gboardDevice.getState = {
    stdout: 'offline\n',
    stderr: '',
    code: 0,
  }
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    attempts: globalThis.gboardDevice.calls.filter((call) =>
      call.startsWith('attempt'),
    ),
    reads: globalThis.gboardDevice.calls.filter((call) => call === 'get-state'),
  }).toEqual({
    error: 'Error: read 1 of the page failed',
    run: {
      test: "Scenario: The pid read failing on adb's error for a lost device ends the call device offline",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline',
    },
    attempts: ['attempt 1'],
    reads: [],
  })
})

test("Scenario: A force-stop that fails on adb's error for a lost device ends the call device offline before the restart reads a pid again, while the old Chrome still runs", async (context) => {
  globalThis.gboardDevice.rejectedTaps = [1]
  globalThis.gboardDevice.adbAnswers = [
    {
      match: /force-stop/,
      answer: {stdout: '', stderr: 'error: device offline\n', code: 1},
    },
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: 'Error: injected tap 1 was rejected',
    run: {
      test: "Scenario: A force-stop that fails on adb's error for a lost device ends the call device offline before the restart reads a pid again, while the old Chrome still runs",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell am force-stop com.android.chrome exited with 1: error: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field rejected',
      'pidof chrome',
      'force-stop chrome',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A force-stop that fails on adb's error for a lost device ends the call device offline, though later pid reads would show a fresh Chrome", async (context) => {
  globalThis.gboardDevice.rejectedTaps = [1]
  globalThis.gboardDevice.adbAnswers = [
    {
      match: /force-stop/,
      answer: {stdout: '', stderr: 'error: device offline\n', code: 1},
    },
    {match: /pidof/, answer: 'device'},
    {match: /pidof/, answer: {stdout: 'pidof exit 1\n', stderr: '', code: 0}},
    {
      match: /pidof/,
      answer: {stdout: '101\npidof exit 0\n', stderr: '', code: 0},
    },
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: 'Error: injected tap 1 was rejected',
    run: {
      test: "Scenario: A force-stop that fails on adb's error for a lost device ends the call device offline, though later pid reads would show a fresh Chrome",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell am force-stop com.android.chrome exited with 1: error: device offline',
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field rejected',
      'pidof chrome',
      'force-stop chrome',
      'force-stop chrome',
    ],
  })
})

test("Scenario: adb's lost-device error while uiautomator2 starts ends the call device offline at once, without polling it again or retrying", async (context) => {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  const fault = new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
  globalThis.gboardDevice.infoErrors = [fault]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error,
    identical: error === fault,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: fault,
    identical: true,
    run: {
      test: "Scenario: adb's lost-device error while uiautomator2 starts ends the call device offline at once, without polling it again or retrying",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: the adb server answered FAIL: device offline',
    },
    calls: ['uiautomator2 info rejected', 'force-stop chrome'],
  })
})

test('Scenario: An ordinary error while uiautomator2 starts is polled again, and the call completes', async (context) => {
  globalThis.gboardDevice.infoErrors = [
    new HTTPError(
      'Unable to connect to uiautomator2 server: connection closed',
    ),
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'foo\n',
    run: {
      test: 'Scenario: An ordinary error while uiautomator2 starts is polled again, and the call completes',
      fails: false,
      state: 'complete',
    },
    calls: [
      'uiautomator2 info rejected',
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter',
      'force-stop chrome',
    ],
  })
})

test("Scenario: adb's lost-device error while the page loads over CDP ends the call device offline at once, without polling it again or retrying", async (context) => {
  const fault = new CommandError(
    'adb forward tcp:9222 localabstract:chrome_devtools_remote exited with 1: error: device offline',
  )
  globalThis.gboardDevice.pageLoadErrors = [fault]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error,
    identical: error === fault,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: fault,
    identical: true,
    run: {
      test: "Scenario: adb's lost-device error while the page loads over CDP ends the call device offline at once, without polling it again or retrying",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb forward tcp:9222 localabstract:chrome_devtools_remote exited with 1: error: device offline',
    },
    calls: ['open chrome', 'page readiness rejected', 'force-stop chrome'],
  })
})

test('Scenario: An ordinary error while the page loads over CDP is polled again, and the call completes', async (context) => {
  globalThis.gboardDevice.pageLoadErrors = [new Error('socket hang up')]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })
  await vi.runAllTimersAsync()
  const run = await running

  expect({
    text: run.text,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'foo\n',
    run: {
      test: 'Scenario: An ordinary error while the page loads over CDP is polled again, and the call completes',
      fails: false,
      state: 'complete',
    },
    calls: [
      'open chrome',
      'page readiness rejected',
      'attempt 1',
      'tap field',
      'tap Enter',
      'force-stop chrome',
    ],
  })
})

test("Scenario: adb's CLI error for a lost device that a helper recognised is never read again, so a message that throws on its second read still ends the call device offline", async (context) => {
  const fault = new CommandError('adb shell dumpsys exited with 1')
  let reads = 0
  Object.defineProperty(fault, 'message', {
    get() {
      if (new Error().stack?.includes('adbLostDevice')) {
        // Only the reads that classify the failure count, not the reporter's.
        reads += 1
        if (reads > 1) {
          throw new Error('message read again')
        }
      }
      return 'adb shell dumpsys exited with 1: error: device offline'
    },
  })
  globalThis.gboardDevice.infoErrors = [fault]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    identical: error === fault,
    reads,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    identical: true,
    reads: 1,
    run: {
      test: "Scenario: adb's CLI error for a lost device that a helper recognised is never read again, so a message that throws on its second read still ends the call device offline",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell dumpsys exited with 1: error: device offline',
    },
    calls: ['uiautomator2 info rejected', 'force-stop chrome'],
  })
})

test("Scenario: The adb server's wrapped `FAIL` for a lost device that a helper recognised is never read again, so a message that throws on its second read still ends the call device offline", async (context) => {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  let reads = 0
  Object.defineProperty(answer, 'message', {
    get() {
      if (new Error().stack?.includes('adbLostDevice')) {
        // Only the reads that classify the failure count, not the reporter's.
        reads += 1
        if (reads > 1) {
          throw new Error('message read again')
        }
      }
      return 'device offline'
    },
  })
  const fault = new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
  globalThis.gboardDevice.infoErrors = [fault]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    identical: error === fault,
    reads,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    identical: true,
    reads: 1,
    run: {
      test: "Scenario: The adb server's wrapped `FAIL` for a lost device that a helper recognised is never read again, so a message that throws on its second read still ends the call device offline",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: the adb server answered FAIL: device offline',
    },
    calls: ['uiautomator2 info rejected', 'force-stop chrome'],
  })
})

test("Scenario: A step whose adb call adb's CLI lost the device on fails with that error as its cause and in its record, not the driver's own recognition of it", async (context) => {
  const fault = new CommandError(
    'adb shell input tap exited with 1: error: device offline',
  )
  // What a helper in the step throws once it recognised the loss.
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = new DeviceLost(
    fault.message,
    fault,
  )
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
    causeIdentical: error.cause === fault,
    reason: driverRuns.at(-1)?.reason,
    record: JSON.parse(
      readFileSync(
        join(
          process.env.THUMBJAR_OUT_DIR!,
          'en-a-step-whose-adb-call-adb-s-cli-lost-the-device-on-fails-with-that-error-as-its-cause-and-in-its-record-not-the-driver-s-own-recognition-of-it.json',
        ),
        'utf8',
      ),
    ).records[0].reason,
  }).toEqual({
    message:
      "adb shell input tap exited with 1: error: device offline\nSteps:\n  1. enter: failed (CommandError: adb shell input tap exited with 1: error: device offline), textAfter 'foo'",
    causeIdentical: true,
    reason: `adb lost the device, so it was not retried: ${fault.message}`,
    record:
      'CommandError: adb shell input tap exited with 1: error: device offline',
  })
})

test("Scenario: A step whose adb call the adb server's `FAIL` lost the device on fails with that error as its cause and in its record, not the driver's own recognition of it", async (context) => {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  const fault = new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
  // What a helper in the step throws once it recognised the loss.
  globalThis.gboardDevice.rejectedTaps = [2]
  globalThis.gboardDevice.rejectedTapError = new DeviceLost(
    'the adb server answered FAIL: device offline',
    fault,
  )
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
    causeIdentical: error.cause === fault,
    reason: driverRuns.at(-1)?.reason,
    record: JSON.parse(
      readFileSync(
        join(
          process.env.THUMBJAR_OUT_DIR!,
          'en-a-step-whose-adb-call-the-adb-server-s-fail-lost-the-device-on-fails-with-that-error-as-its-cause-and-in-its-record-not-the-driver-s-own-recognition-of-it.json',
        ),
        'utf8',
      ),
    ).records[0].reason,
  }).toEqual({
    message:
      "Unable to connect to uiautomator2 server: device offline\nSteps:\n  1. enter: failed (HTTPError: Unable to connect to uiautomator2 server: device offline (AdbError: device offline)), textAfter 'foo'",
    causeIdentical: true,
    reason: `adb lost the device, so it was not retried: ${'the adb server answered FAIL: device offline'}`,
    record:
      'HTTPError: Unable to connect to uiautomator2 server: device offline (AdbError: device offline)',
  })
})

test("Scenario: The wait for uiautomator2 passes on a lost device a helper below it already recognised, never reading adb's error again", async (context) => {
  const fault = new CommandError('adb shell exited with 1')
  let reads = 0
  Object.defineProperty(fault, 'message', {
    get() {
      if (new Error().stack?.includes('adbLostDevice')) {
        // Only the reads that classify the failure count, not the reporter's.
        reads += 1
      }
      return 'adb shell exited with 1: error: device offline'
    },
  })
  globalThis.gboardDevice.infoErrors = [
    new DeviceLost('adb shell exited with 1: error: device offline', fault),
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    identical: error === fault,
    reads,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    identical: true,
    reads: 0,
    run: {
      test: "Scenario: The wait for uiautomator2 passes on a lost device a helper below it already recognised, never reading adb's error again",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell exited with 1: error: device offline',
    },
    calls: ['uiautomator2 info rejected', 'force-stop chrome'],
  })
})

test("Scenario: The wait for the page over CDP passes on a lost device a helper below it already recognised, never reading adb's error again", async (context) => {
  const fault = new CommandError('adb shell exited with 1')
  let reads = 0
  Object.defineProperty(fault, 'message', {
    get() {
      if (new Error().stack?.includes('adbLostDevice')) {
        // Only the reads that classify the failure count, not the reporter's.
        reads += 1
      }
      return 'adb shell exited with 1: error: device offline'
    },
  })
  globalThis.gboardDevice.pageLoadErrors = [
    new DeviceLost('adb shell exited with 1: error: device offline', fault),
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    identical: error === fault,
    reads,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    identical: true,
    reads: 0,
    run: {
      test: "Scenario: The wait for the page over CDP passes on a lost device a helper below it already recognised, never reading adb's error again",
      fails: false,
      state: 'device-offline',
      reason:
        'adb lost the device, so it was not retried: adb shell exited with 1: error: device offline',
    },
    calls: ['open chrome', 'page readiness rejected', 'force-stop chrome'],
  })
})

test("Scenario: A `typeOnDevice` call a `runOnDevice` step queues keeps its own retry, so adb's lost-device error while uiautomator2 starts is polled through and the call completes", async (context) => {
  const fault = new CommandError('device offline')
  let queued: Promise<unknown> | undefined
  const step = {
    get type(): 'enter' {
      if (globalThis.gboardDevice.attempt === 1 && queued === undefined) {
        // Read while the strict attempt runs, so the call is queued from inside its strict scope.
        globalThis.gboardDevice.infoErrors = [fault, fault]
        queued = typeOnDevice({
          keyboard: 'en',
          url: 'http://localhost:8765/editor.html',
          prefix: 'foo',
          words: [],
        }).catch((error: unknown) => error)
      }
      return 'enter'
    },
  }
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [step],
  })
  await vi.runAllTimersAsync()
  const run = await running
  const typed = await queued

  expect({
    text: run.text,
    typed,
    runs: driverRuns.slice(-2),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'foo\n',
    typed: {
      text: 'foo',
      picked: [],
      compositionstart: 0,
      nested: 0,
      compositionstartPerWord: [],
    },
    runs: [
      {
        test: "Scenario: A `typeOnDevice` call a `runOnDevice` step queues keeps its own retry, so adb's lost-device error while uiautomator2 starts is polled through and the call completes",
        fails: false,
        state: 'complete',
      },
      {
        test: "Scenario: A `typeOnDevice` call a `runOnDevice` step queues keeps its own retry, so adb's lost-device error while uiautomator2 starts is polled through and the call completes",
        fails: false,
        state: 'complete',
      },
    ],
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap Enter',
      'force-stop chrome',
      'uiautomator2 info rejected',
      'uiautomator2 info rejected',
      'open chrome',
      'attempt 2',
      'tap field',
      'force-stop chrome',
    ],
  })
})

test("Scenario: A `runOnDevice` call a `typeOnDevice` word queues is strict for its own attempt, so adb's lost-device error while uiautomator2 starts ends it device offline", async (context) => {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  const fault = new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
  let queued: Promise<unknown> | undefined
  const word = {
    get letters() {
      if (queued === undefined) {
        // Read while the legacy attempt runs, so the call is queued from inside it.
        queued = runOnDevice(context, {
          keyboard: 'en',
          url: 'http://localhost:8765/editor.html',
          prefix: 'foo',
          steps: [{type: 'enter'}],
        }).catch((error: unknown) => error)
        // Armed for the queued call, once the legacy call's own readiness passed.
        globalThis.gboardDevice.infoErrors = [fault]
      }
      return 'a'
    },
  }
  const typing = typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    words: [word],
  })
  await vi.runAllTimersAsync()
  const typed = await typing
  const error = await queued

  expect({
    text: typed.text,
    identical: error === fault,
    runs: driverRuns.slice(-2),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    text: 'fooa ',
    identical: true,
    runs: [
      {
        test: "Scenario: A `runOnDevice` call a `typeOnDevice` word queues is strict for its own attempt, so adb's lost-device error while uiautomator2 starts ends it device offline",
        fails: false,
        state: 'complete',
      },
      {
        test: "Scenario: A `runOnDevice` call a `typeOnDevice` word queues is strict for its own attempt, so adb's lost-device error while uiautomator2 starts ends it device offline",
        fails: false,
        state: 'device-offline',
        reason:
          'adb lost the device, so it was not retried: the adb server answered FAIL: device offline',
      },
    ],
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'tap A',
      'tap Space',
      'force-stop chrome',
      'uiautomator2 info rejected',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A pid read that times out and an `adb get-state` that answers offline end the call device offline', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = {stdout: 'offline\n', stderr: '', code: 0}
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect(driverRuns.at(-1)).toEqual({
    test: 'Scenario: A pid read that times out and an `adb get-state` that answers offline end the call device offline',
    fails: false,
    state: 'device-offline',
    reason:
      'adb lost the device (adb get-state: offline), so it was not retried',
  })
})

test('Scenario: A pid read that times out while `adb get-state` answers device on stdout is inconclusive and marked answered, whatever adb wrote on stderr', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = {
    stdout: 'device\n',
    stderr:
      '* daemon not running; starting now at tcp:5037\n* daemon started successfully\n',
    code: 0,
  }
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect(driverRuns.at(-1)).toEqual({
    test: 'Scenario: A pid read that times out while `adb get-state` answers device on stdout is inconclusive and marked answered, whatever adb wrote on stderr',
    fails: false,
    state: 'inconclusive',
    reason: expect.stringMatching(
      /^the restart before the retry did not show a fresh Chrome: adb timed out during the Chrome restart: adb shell pidof com\.android\.chrome ran past \d+s before the restart, old pid unread, new pid unread$/,
    ),
    deviceAnswered: true,
  })
})

test('Scenario: A pid read that times out and an `adb get-state` that never answers is inconclusive and marked unconfirmed, never device offline', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect(driverRuns.at(-1)).toEqual({
    test: 'Scenario: A pid read that times out and an `adb get-state` that never answers is inconclusive and marked unconfirmed, never device offline',
    fails: false,
    state: 'inconclusive',
    reason: expect.stringMatching(
      /^the restart before the retry did not show a fresh Chrome: adb timed out during the Chrome restart: adb shell pidof com\.android\.chrome ran past \d+s before the restart, old pid unread, new pid unread$/,
    ),
    deviceUnconfirmed: true,
  })
})

test('Scenario: Two timeouts before any input read `adb get-state` once in the call', async (context) => {
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: 'hangs'},
    {match: /dumpsys input_method/, answer: 'hangs'},
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    error: 'CommandError: adb shell dumpsys input_method timed out after 30s',
    run: {
      test: 'Scenario: Two timeouts before any input read `adb get-state` once in the call',
      fails: false,
      state: 'faulted',
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
      'pidof chrome',
      'attempt 2',
      'tap field',
      'shell dumpsys input_method',
      'force-stop chrome',
    ],
  })
})

test('Scenario: The state read answers only the failure it was read for, so a later timeout in the call is unconfirmed', async (context) => {
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: 'hangs'},
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  // The device answers `device` for the first timeout and goes offline before the second.
  setTimeout(() => {
    globalThis.gboardDevice.getState = {
      stdout: 'offline\n',
      stderr: '',
      code: 0,
    }
  }, 35_000)
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = await running

  expect({
    error: String(error),
    run: driverRuns.at(-1),
    reads: globalThis.gboardDevice.calls.filter((call) => call === 'get-state'),
  }).toEqual({
    error: 'CommandError: adb shell dumpsys input_method timed out after 30s',
    run: {
      test: 'Scenario: The state read answers only the failure it was read for, so a later timeout in the call is unconfirmed',
      fails: false,
      state: 'inconclusive',
      reason: expect.stringMatching(
        /^the restart before the retry did not show a fresh Chrome: adb timed out during the Chrome restart: /,
      ),
      deviceUnconfirmed: true,
    },
    reads: ['get-state'],
  })
})

test('Scenario: A later failure that throws the same error object as the timeout the state read answered is unconfirmed', async (context) => {
  const fault = new CommandError('adb shell input tap timed out after 15s')
  fault.timedOut = true
  globalThis.gboardDevice.rejectedTaps = [1, 2]
  globalThis.gboardDevice.rejectedTapError = fault
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: 'Scenario: A later failure that throws the same error object as the timeout the state read answered is unconfirmed',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
      deviceUnconfirmed: true,
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field rejected',
      'get-state',
      'pidof chrome',
      'force-stop chrome',
      'pidof chrome',
      'open chrome',
      'pidof chrome',
      'attempt 2',
      'tap field',
      'tap Enter rejected',
      'force-stop chrome',
    ],
  })
})

test('Scenario: A step that throws the same error on both attempts is unconfirmed on the second, whose failure the state read never answered', async (context) => {
  const fault = new CommandError('adb shell input tap timed out after 15s')
  fault.timedOut = true
  const first = {
    get type(): 'enter' {
      if (globalThis.gboardDevice.attempt === 1) {
        throw fault
      }
      return 'enter'
    },
  }
  const second = {
    get type(): 'enter' {
      if (globalThis.gboardDevice.attempt === 2) {
        throw fault
      }
      return 'enter'
    },
  }
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [first, second],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: 'Scenario: A step that throws the same error on both attempts is unconfirmed on the second, whose failure the state read never answered',
      fails: false,
      state: 'inconclusive',
      reason: 'the driver faulted after it sent input, so it was not retried',
      deviceUnconfirmed: true,
    },
    calls: [
      'open chrome',
      'attempt 1',
      'tap field',
      'get-state',
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

test("Scenario: adb's CLI error for a lost device is read once to classify and quote it, so a message that throws when read again cannot reopen a retry after input", async (context) => {
  const fault = new CommandError('adb shell input tap exited with 1')
  let reads = 0
  Object.defineProperty(fault, 'message', {
    get() {
      if (new Error().stack?.includes('terminalOutcome')) {
        // Only the reads that classify the failure count, not the step record's or the reporter's.
        reads += 1
        if (reads > 1) {
          throw new Error('message read again')
        }
      }
      return 'adb shell input tap exited with 1: error: device offline'
    },
  })
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.rejectedTaps = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: adb's CLI error for a lost device is read once to classify and quote it, so a message that throws when read again cannot reopen a retry after input",
      fails: false,
      state: 'device-offline',
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

test("Scenario: The adb server's wrapped `FAIL` for a lost device is read once to classify and quote it, so a message that throws when read again cannot reopen a retry after input", async (context) => {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  let reads = 0
  Object.defineProperty(answer, 'message', {
    get() {
      if (new Error().stack?.includes('terminalOutcome')) {
        // Only the reads that classify the failure count, not the step record's or the reporter's.
        reads += 1
        if (reads > 1) {
          throw new Error('message read again')
        }
      }
      return 'device offline'
    },
  })
  const fault = new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
  globalThis.gboardDevice.rejectedTapError = fault
  globalThis.gboardDevice.rejectedTaps = [2]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  const error = (await running) as Error

  expect({
    cause: error.cause,
    run: driverRuns.at(-1),
    calls: globalThis.gboardDevice.calls,
  }).toEqual({
    cause: fault,
    run: {
      test: "Scenario: The adb server's wrapped `FAIL` for a lost device is read once to classify and quote it, so a message that throws when read again cannot reopen a retry after input",
      fails: false,
      state: 'device-offline',
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
