import {expect, test, vi} from 'vitest'
import {ATTEMPT_SECONDS, JOIN_GRACE_SECONDS} from './device/budget.ts'
import {lastDriverRun, runOnDevice} from './driver.ts'
import type {StepTaps} from './gboard/typing.ts'

const control = vi.hoisted(() => ({
  attempts: 0,
  releaseFirst: () => {},
  releaseSecond: () => {},
  firstReported: Promise.resolve(),
}))

vi.mock('./gboard/typing.ts', async (importOriginal) => {
  const attempt = async (onTaps: (taps: StepTaps[]) => void) => {
    control.attempts += 1
    if (control.attempts === 1) {
      const released = new Promise<void>((resolve) => {
        control.releaseFirst = resolve
      })
      control.firstReported = released.then(() => {
        onTaps([{keys: ['first'], events: []}])
      })
      await control.firstReported
    } else {
      onTaps([{keys: ['second'], events: []}])
      await new Promise<void>((resolve) => {
        control.releaseSecond = resolve
      })
    }
    return {steps: [], text: '', selection: null, events: []}
  }
  return {
    ...(await importOriginal<typeof import('./gboard/typing.ts')>()),
    runInChrome: (
      _name: string,
      _options: unknown,
      _connect: unknown,
      _onStepFailure: unknown,
      _hooks: unknown,
      onTaps: (taps: StepTaps[]) => void,
    ) => attempt(onTaps),
    closeChrome: () => Promise.resolve(),
    stopChromeForRetry: () => Promise.resolve(['100']),
    dumpFailure: () => Promise.resolve(),
  }
})

const url = 'http://localhost:8765/editor.html'

test(`runOnDevice keeps the taps of the retry when the first attempt reports after it was given up on`, async (context) => {
  vi.useFakeTimers()
  control.attempts = 0
  const running = runOnDevice(context, {
    url,
    keyboard: 'en',
    prefix: '',
    steps: [],
  })
  await vi.advanceTimersByTimeAsync(
    (ATTEMPT_SECONDS + 2 * JOIN_GRACE_SECONDS) * 1000,
  )
  expect(control.attempts).toEqual(2)

  control.releaseFirst()
  await control.firstReported
  const taps = lastDriverRun(context.task)?.taps
  control.releaseSecond()
  await running

  expect(taps).toEqual([{keys: ['second'], events: []}])
})
