import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

// Each case is a call with a `crash` whose first attempt faults before any input, on a first dump of Gboard
// that hangs until the attempt's bound, and a pid read in the Chrome restart before the retry then fails,
// so the call ends on that read.

const NO_FRESH_CHROME =
  'InconclusiveAttempt: Inconclusive: the driver faulted and the restart before its retry did not show a fresh Chrome, so the retry did not run. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted:'

function offline(state: string): string {
  return `InconclusiveAttempt: Inconclusive: the device went offline (adb: ${state}) before the retry, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted:`
}

function typeKyou() {
  return typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', expect: {trigger: 'letters'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
}

async function endOn(
  chrome: Parameters<typeof globalThis.fakeChrome>[0],
): Promise<{
  result: unknown
  taps: string[][]
  run: unknown
  chrome: string[]
}> {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['', 'Kyou '], hangFirstDump: true})
  globalThis.fakeChrome(chrome)
  const typing = typeKyou()
  await vi.runAllTimersAsync()
  const run = driverRuns.at(-1)
  return {
    result: await typing,
    taps: globalThis.gboardTaps(),
    run: {
      state: run?.state,
      deviceOffline: run?.deviceOffline,
      deviceAnswered: run?.deviceAnswered,
      deviceUnconfirmed: run?.deviceUnconfirmed,
    },
    chrome: globalThis.chromeCalls(),
  }
}

test('Scenario: A pid read that fails as `adb: device offline` names the device offline and its state', async () => {
  expect(
    await endOn({
      pidofFails: {read: 1, stderr: 'adb: device offline'},
      getState: 'offline',
    }),
  ).toEqual({
    result: `${offline('offline')} adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline, old pid unread, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: ['pidof failed', 'get-state', 'force-stop'],
  })
})

test('Scenario: A pid read that fails as `error: closed` after the force-stop names the device offline', async () => {
  expect(
    await endOn({
      pidofFails: {read: 2, stderr: 'error: closed'},
      getState: 'offline',
    }),
  ).toEqual({
    result: `${offline('offline')} adb shell pidof com.android.chrome failed after the force-stop: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: error: closed, old pid 4100, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof failed',
      'get-state',
      'force-stop',
    ],
  })
})

test('Scenario: A pid read that finds no device names the device offline with the state adb gives', async () => {
  expect(
    await endOn({
      pidofFails: {read: 1, stderr: 'adb: no devices/emulators found'},
      getState: 'unknown',
    }),
  ).toEqual({
    result: `${offline('unknown')} adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: no devices/emulators found, old pid unread, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: ['pidof failed', 'get-state', 'force-stop'],
  })
})

test('Scenario: A pid read that times out names the device offline and still the adb timeout', async () => {
  expect(await endOn({pidofTimesOutAfter: 1, getState: 'offline'})).toEqual({
    result: `${offline('offline')} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the force-stop, old pid 4100, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'get-state',
      'force-stop',
    ],
  })
})

test('Scenario: A pid read that fails as `adb: device offline` counts as device offline even when `adb get-state` then answers `device`', async () => {
  const ended = await endOn({
    pidofFails: {read: 1, stderr: 'adb: device offline'},
  })
  expect({
    ...ended,
    namesStateDevice: String(ended.result).includes('(adb: device)'),
  }).toEqual({
    result: `InconclusiveAttempt: Inconclusive: the device went offline before the retry, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted: adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline, old pid unread, new pid unread`,
    taps: [[]],
    run: {
      state: 'inconclusive',
      deviceOffline: true,
      deviceAnswered: undefined,
    },
    chrome: ['pidof failed', 'get-state', 'force-stop'],
    namesStateDevice: false,
  })
})

test('Scenario: A pid read that times out while `adb get-state` answers `device` keeps the message that no fresh Chrome showed', async () => {
  const ended = await endOn({pidofTimesOutAfter: 1})
  expect({
    ...ended,
    namesStateDevice: String(ended.result).includes('(adb: device)'),
  }).toEqual({
    result: `${NO_FRESH_CHROME} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the force-stop, old pid 4100, new pid unread`,
    taps: [[]],
    run: {
      state: 'inconclusive',
      deviceOffline: undefined,
      deviceAnswered: true,
    },
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'get-state',
      'force-stop',
    ],
    namesStateDevice: false,
  })
})

test('Scenario: A pid read that times out while `adb get-state` times out too names the device offline and that error', async () => {
  expect(await endOn({pidofTimesOutAfter: 1, getState: 'timeout'})).toEqual({
    result: `${offline('CommandTimeoutError: adb get-state timed out after 5s')} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the force-stop, old pid 4100, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'get-state',
      'force-stop',
    ],
  })
})

test('Scenario: A device offline whose `adb get-state` fails too names that error instead of a state', async () => {
  expect(
    await endOn({
      pidofFails: {read: 1, stderr: 'adb: device offline'},
      getState: {stderr: 'error: no devices/emulators found'},
    }),
  ).toEqual({
    result: `${offline('CommandError: adb get-state exited with 1: error: no devices/emulators found')} adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline, old pid unread, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: ['pidof failed', 'get-state', 'force-stop'],
  })
})

test('Scenario: A pid read that fails as `adb: device offline` after the relaunch names the device offline, and the retry taps nothing', async () => {
  expect(
    await endOn({
      pidofFails: {read: 3, stderr: 'adb: device offline'},
      getState: 'offline',
    }),
  ).toEqual({
    result: `${offline('offline')} adb shell pidof com.android.chrome failed after the relaunch: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline, old pid 4100, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: true},
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'pidof failed',
      'get-state',
      'force-stop',
    ],
  })
})

test('Scenario: A pid read that fails on the device, not in adb, keeps the message that no fresh Chrome showed', async () => {
  expect(
    await endOn({
      pidofFails: {
        read: 1,
        stderr: '/system/bin/sh: pidof: inaccessible or not found',
      },
    }),
  ).toEqual({
    result: `${NO_FRESH_CHROME} adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: /system/bin/sh: pidof: inaccessible or not found, old pid unread, new pid unread`,
    taps: [[]],
    run: {state: 'inconclusive', deviceOffline: undefined},
    chrome: ['pidof failed', 'force-stop'],
  })
})

test('Scenario: A pid read after the relaunch that times out just before the attempt deadline keeps the message that no fresh Chrome showed and leaves the device unconfirmed when its `adb get-state` is stopped', async () => {
  expect(
    await endOn({
      slowPidof: {read: 3, seconds: 170},
      pidofTimesOutAfter: 2,
      getState: 'hangs',
    }),
  ).toEqual({
    result: `${NO_FRESH_CHROME} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the relaunch, old pid 4100, new pid unread`,
    taps: [[]],
    run: {
      state: 'inconclusive',
      deviceOffline: undefined,
      deviceAnswered: undefined,
      deviceUnconfirmed: true,
    },
    chrome: [
      'pidof 4100',
      'force-stop',
      'pidof 4101',
      'pidof 4101',
      'get-state',
      'force-stop',
    ],
  })
})

test('Scenario: A pid read that fails as `adb: device offline` still names the device offline when its `adb get-state` is stopped', async () => {
  expect(
    await endOn({
      pidofFails: {read: 1, stderr: 'adb: device offline'},
      getState: 'hangs',
    }),
  ).toEqual({
    result: `InconclusiveAttempt: Inconclusive: the device went offline before the retry, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted: adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline, old pid unread, new pid unread`,
    taps: [[]],
    run: {
      state: 'inconclusive',
      deviceOffline: true,
      deviceAnswered: undefined,
    },
    chrome: ['pidof failed', 'get-state', 'force-stop'],
  })
})
