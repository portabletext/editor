import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {expect, test, vi} from 'vitest'
import {unstoppedProcesses} from '../../lib/adb.ts'
import {
  ChromeNotRestarted,
  lostDevice,
  NoFreshChrome,
  readDeviceState,
} from '../../lib/typing.ts'

const signals = vi.hoisted(() => [] as string[])

// The real `adb.ts` under `readDeviceState`. Its `adb get-state` is a process that closes only 9 seconds
// after it started, so after adb's SIGTERM at 5 and SIGKILL at 7, and after the read's own 9-second deadline,
// which was armed first and wins.
vi.mock(import('node:child_process'), async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: (() => {
    const child = Object.assign(new EventEmitter(), {
      pid: 4343,
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: (signal: string) => {
        signals.push(signal)
        return true
      },
    })
    setTimeout(() => child.emit('close', null), 9000)
    return child
  }) as never,
}))

test('Scenario: An `adb get-state` after a pid read that timed out, stopped by its own deadline as adb closes, leaves the device unconfirmed', async () => {
  vi.useFakeTimers()
  const error = new ChromeNotRestarted(
    'adb timed out during the Chrome restart',
    ['4100'],
    undefined,
    'timeout',
  )
  const reading = readDeviceState(error)
  await vi.runAllTimersAsync()
  await reading
  const noFreshChrome = new NoFreshChrome(error)

  expect({
    state: error.state,
    offline: lostDevice(error),
    deviceAnswered: noFreshChrome.deviceAnswered,
    deviceUnconfirmed: noFreshChrome.deviceUnconfirmed,
    unstopped: unstoppedProcesses(),
    signals,
  }).toEqual({
    state: undefined,
    offline: false,
    deviceAnswered: false,
    deviceUnconfirmed: true,
    unstopped: [],
    signals: ['SIGTERM', 'SIGKILL'],
  })
})
