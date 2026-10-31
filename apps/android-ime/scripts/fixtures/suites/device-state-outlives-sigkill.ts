import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {beforeEach, vi} from 'vitest'

// For a crash file on `crash-page.ts` with `hungFirstDump`, so every first attempt faults before any input
// and is retried. The `pidof` after the force-stop of the Chrome restart before the retry times out, and the
// `adb get-state` after it spawns an adb process that never exits, whatever it is sent. The bounds are
// short, as the file runs on real timers.
vi.mock(import('node:child_process'), async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: (() =>
    Object.assign(new EventEmitter(), {
      pid: 4343,
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: () => true,
    })) as never,
}))

vi.mock(import('../../lib/budget.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  ATTEMPT_SECONDS: 1,
  KILL_GRACE_SECONDS: 0.1,
  DEVICE_STATE_SECONDS: 0.2,
  DEVICE_STATE_READ_SECONDS: 1,
}))

beforeEach(() => {
  globalThis.fakeChrome({pidofTimesOutAfter: 1, getState: 'spawned'})
})
