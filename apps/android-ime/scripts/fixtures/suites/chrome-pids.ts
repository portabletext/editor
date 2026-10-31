import type {adb, CommandError, CommandTimeoutError} from '../../lib/adb.ts'
import {DEVICE_STATE_SECONDS} from '../../lib/budget.ts'
import {currentSignal, whenAborted} from '../../lib/util.ts'

// Chrome's process on a fake device for the restart before a retry: `pidof` reads its pid, and once a
// force-stop stopped it, the next launch runs under a new one, unless `fakeChrome` says otherwise. `adb
// get-state` answers for the device.
const chrome = {
  pid: 4100,
  survivesStop: false,
  stopFails: undefined as 'exit' | 'timeout' | undefined,
  pidofTimesOutAfter: undefined as number | undefined,
  pidofFails: undefined as {read: number; stderr: string} | undefined,
  slowPidof: undefined as {read: number; seconds: number} | undefined,
  getState: 'device' as
    | string
    | {stderr: string}
    | 'timeout'
    | 'hangs'
    | 'spawned',
  notRunning: false,
  relaunch: undefined as 'none' | 'old' | undefined,
  pidofReads: 0,
  calls: [] as string[],
}

/**
 * What the fake device answers `adb shell pidof` and `adb shell am force-stop` for Chrome and `adb get-state`, `undefined` for
 * anything else. `original` is the mocked module itself.
 */
export function chromeAdb(
  args: string[],
  original: {
    adb: typeof adb
    CommandError: typeof CommandError
    CommandTimeoutError: typeof CommandTimeoutError
  },
): string | Promise<string> | undefined {
  const {CommandError, CommandTimeoutError} = original
  const command = args.join(' ')
  if (command.startsWith('shell pidof com.android.chrome')) {
    chrome.pidofReads += 1
    if (chrome.slowPidof?.read === chrome.pidofReads) {
      const {seconds} = chrome.slowPidof
      return new Promise((resolve) => setTimeout(resolve, seconds * 1000)).then(
        () => pidof(command, original),
      )
    }
    return pidof(command, original)
  }
  if (command === 'shell am force-stop com.android.chrome') {
    if (!chrome.survivesStop && !chrome.notRunning) chrome.pid += 1
    chrome.notRunning = false
    chrome.calls.push('force-stop')
    if (chrome.stopFails === 'exit')
      throw new CommandError(`adb ${command} exited with 255: error: closed`)
    if (chrome.stopFails === 'timeout')
      throw new CommandTimeoutError(`adb ${command} timed out after 15s`)
    return ''
  }
  if (command === 'get-state') {
    chrome.calls.push('get-state')
    if (chrome.getState === 'timeout')
      throw new CommandTimeoutError(`adb ${command} timed out after 5s`)
    if (chrome.getState === 'hangs') return whenAborted(currentSignal()!)
    if (chrome.getState === 'spawned')
      return original.adb(args, DEVICE_STATE_SECONDS)
    if (typeof chrome.getState !== 'string')
      throw new CommandError(
        `adb ${command} exited with 1: ${chrome.getState.stderr}`,
      )
    return `${chrome.getState}\n`
  }
  return undefined
}

/** The answer to the read of Chrome's pid that `chromeAdb` counted last. */
function pidof(
  command: string,
  {CommandError, CommandTimeoutError}: Parameters<typeof chromeAdb>[1],
): string {
  if (chrome.pidofFails?.read === chrome.pidofReads) {
    chrome.calls.push('pidof failed')
    throw new CommandError(
      `adb ${command} exited with 1: ${chrome.pidofFails.stderr}`,
    )
  }
  if (
    chrome.notRunning ||
    (chrome.relaunch === 'none' && chrome.pidofReads === 3)
  ) {
    chrome.calls.push('pidof none')
    return 'pidof exit 1\n'
  }
  if (chrome.relaunch === 'old' && chrome.pidofReads === 3) {
    chrome.calls.push('pidof 4100')
    return '4100\npidof exit 0\n'
  }
  chrome.calls.push(`pidof ${chrome.pid}`)
  if (
    chrome.pidofTimesOutAfter !== undefined &&
    chrome.pidofReads > chrome.pidofTimesOutAfter
  )
    throw new CommandTimeoutError(`adb ${command} timed out after 5s`)
  return `${chrome.pid}\npidof exit 0\n`
}

declare global {
  /** Set up the fake Chrome process for the next `typeOnDevice` call. */
  var fakeChrome: (options?: {
    /** A force-stop leaves the old process running. */
    survivesStop?: true
    /** A force-stop exits non-zero or times out, and Chrome stops anyway unless `survivesStop`. */
    stopFails?: 'exit' | 'timeout'
    /** Every `pidof` after this many times out. */
    pidofTimesOutAfter?: number
    /** The `read`th `pidof` exits 1 with `stderr`, as adb does when it cannot reach the device. */
    pidofFails?: {read: number; stderr: string}
    /** The `read`th `pidof` answers only after `seconds`. */
    slowPidof?: {read: number; seconds: number}
    /**
     * What `adb get-state` prints, `device` by default, or its exit 1 with `stderr`, or its timeout, or
     * whether it hangs until its call is stopped, or whether it spawns its adb process as the driver does.
     */
    getState?: string | {stderr: string} | 'timeout' | 'hangs' | 'spawned'
    /** No Chrome runs until the next force-stop, which the relaunch after it follows. */
    notRunning?: true
    /** The third `pidof`, the one after the retry's relaunch, finds no Chrome or the first one's pid. */
    relaunch?: 'none' | 'old'
  }) => void
  /** The `pidof` reads, with the pid they returned, force-stops and `get-state` reads of the call so far. */
  var chromeCalls: () => string[]
}
globalThis.fakeChrome = (options = {}) => {
  Object.assign(chrome, {
    pid: 4100,
    survivesStop: options.survivesStop ?? false,
    stopFails: options.stopFails,
    pidofTimesOutAfter: options.pidofTimesOutAfter,
    pidofFails: options.pidofFails,
    slowPidof: options.slowPidof,
    getState: options.getState ?? 'device',
    notRunning: options.notRunning ?? false,
    relaunch: options.relaunch,
    pidofReads: 0,
    calls: [],
  })
}
globalThis.chromeCalls = () => chrome.calls
