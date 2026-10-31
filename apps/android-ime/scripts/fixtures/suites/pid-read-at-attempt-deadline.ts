import {appendFileSync} from 'node:fs'
import {afterEach, beforeEach, vi} from 'vitest'

// For a crash file on `crash-page.ts` with `hungFirstDump`, so every first attempt faults before any input
// and is retried. The restart before the retry stops Chrome, and the retry's `pidof` after the relaunch
// times out half a second before the attempt's bound. The `adb get-state` after it hangs until its call is
// stopped. The bounds are short, as the file runs on real timers. `IME_CALLS_FILE` gets each test's taps and
// Chrome calls.
vi.mock(import('../../lib/budget.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  ATTEMPT_SECONDS: 2,
  DEVICE_STATE_READ_SECONDS: 0.5,
}))

beforeEach(() => {
  globalThis.fakeChrome({
    slowPidof: {read: 3, seconds: 1.5},
    pidofTimesOutAfter: 2,
    getState: 'hangs',
  })
})

afterEach(({task}) => {
  appendFileSync(
    process.env.IME_CALLS_FILE!,
    `${JSON.stringify({test: task.name, taps: globalThis.gboardTaps(), chrome: globalThis.chromeCalls()})}\n`,
  )
})
