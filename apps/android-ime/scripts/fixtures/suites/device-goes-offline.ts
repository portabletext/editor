import {beforeEach, vi} from 'vitest'

// For a crash file on `crash-page.ts` with `hungFirstDump`, so every first attempt faults before any input
// and is retried. In the file's first test the `pidof` after the force-stop of the Chrome restart before the
// retry times out and `adb get-state` then answers `device`. From the second on the device went offline, as
// adb says of a device it lost.
vi.mock(import('../../lib/budget.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  ATTEMPT_SECONDS: 1,
}))

let tests = 0

beforeEach(() => {
  tests += 1
  globalThis.fakeChrome(
    tests === 1
      ? {pidofTimesOutAfter: 1}
      : {
          pidofFails: {read: 1, stderr: 'adb: device offline'},
          getState: 'offline',
        },
  )
})
