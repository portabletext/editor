// Type through Gboard's own keys into a page in Android Chrome and read the result back over CDP.
//
// A device test calls `typeOnDevice` and asserts on what it returns. The driver retries only driver
// faults. The one fault it classifies from the typed text is a digit that neither the prefix nor the
// letters hold, see `typeInChrome`.

import {mkdirSync} from 'node:fs'
import {TestRunner, type RunnerTestCase} from 'vitest'
import {assertNoUnstoppedProcess, unstoppedProcesses} from './lib/adb.ts'
import {
  ATTEMPT_SECONDS,
  CLEANUP_SECONDS,
  FAILURE_DUMP_SECONDS,
  RESTART_SECONDS,
  SERVER_CLOSE_SECONDS,
} from './lib/budget.ts'
import {PageExceptionError} from './lib/cdp.ts'
import {
  closeChrome,
  dumpFailure,
  OUT,
  typeInChrome,
  type TypeOnDeviceOptions,
  type Typed,
} from './lib/typing.ts'
import {Device} from './lib/u2.ts'
import {
  errorRepr,
  phase,
  resetPhaseClock,
  runAbortable,
  watchdog,
  withDeadline,
} from './lib/util.ts'

export type {TypeOnDeviceOptions, Typed, Word} from './lib/typing.ts'

const WATCHDOG_SECONDS = ATTEMPT_SECONDS - 15

export type DriverRun = {
  test: string
  fails: boolean
  /**
   * `driving` until the driver returned a result and cleaned up, `faulted` when it ended on a driver fault,
   * after one attempt or two.
   * `aborted` when the test timed out or was cancelled first, and no later cleanup changes it.
   * `page-exception` when an expression threw in the page, which can be an editor result and is never
   * retried.
   */
  state: 'driving' | 'complete' | 'faulted' | 'aborted' | 'page-exception'
  /** The page's exception, for a `page-exception` run. */
  pageException?: string
}

/**
 * Every `typeOnDevice` call in the current test file. `test.fails` counts any error, a timeout included, as
 * its expected failure, so `tests/setup.ts` fails the file for a `test.fails` run that never completed.
 */
export const driverRuns: DriverRun[] = []

// The last `typeOnDevice` call, which can still be stopping after its test timed out.
let previousRun: Promise<void> = Promise.resolve()

/**
 * Open `page` in Chrome, which is stopped and started again for each test, picking the page by its exact
 * URL. Type `words` on Gboard and read back what the page holds. A driver fault restarts Chrome and types
 * everything again once. Artifacts go to `out/<lang>-<test name>*`.
 */
export async function typeOnDevice(
  options: TypeOnDeviceOptions,
): Promise<Typed> {
  const currentTest = TestRunner.getCurrentTest<RunnerTestCase | undefined>()
  if (!currentTest) throw new Error('`typeOnDevice` runs inside a test')
  const run: DriverRun = {
    test: currentTest.name,
    fails: Boolean(currentTest.fails),
    state: 'driving',
  }
  driverRuns.push(run)
  const name = `${options.lang}-${slug(currentTest.name)}`
  mkdirSync(OUT, {recursive: true})
  await previousRun
  try {
    assertNoUnstoppedProcess()
  } catch (error) {
    run.state = 'faulted'
    throw error
  }
  const testSignal = currentTest.context.signal
  const settle = (state: 'complete' | 'faulted' | 'page-exception') => {
    if (run.state === 'driving')
      run.state = testSignal.aborted ? 'aborted' : state
  }
  if (testSignal.aborted) run.state = 'aborted'
  else
    testSignal.addEventListener(
      'abort',
      () => {
        if (run.state === 'driving') run.state = 'aborted'
      },
      {once: true},
    )
  // A test that times out aborts its signal, which stops every device call of this run.
  const running = runAbortable(testSignal, async () => {
    let typed: Typed
    try {
      typed = await withDriverRetry({
        name,
        attempt: (attempt) =>
          timedAttempt(attempt === 1 ? name : `${name}-retry`, options),
        restart: () =>
          withDeadline('restarting Chrome', RESTART_SECONDS, closeChrome),
        canRetry: (error) =>
          !(error instanceof PageExceptionError) &&
          unstoppedProcesses().length === 0,
      })
    } catch (error) {
      if (error instanceof PageExceptionError) {
        settle('page-exception')
        run.pageException = error.message
      } else settle('faulted')
      await cleanUpChrome().catch((cleanupError: unknown) =>
        phase(`cleanup failed: ${errorRepr(cleanupError)}`),
      )
      throw error
    }
    try {
      await cleanUpChrome()
      assertNoUnstoppedProcess()
    } catch (error) {
      settle('faulted')
      throw error
    }
    settle('complete')
    return typed
  })
  previousRun = running.then(
    () => {},
    () => {},
  )
  return running
}

/**
 * Run `attempt`, and once more after `restart` when it throws and `canRetry` allows it. The second
 * attempt's error is the one that propagates.
 */
export async function withDriverRetry<T>({
  name,
  attempt,
  restart,
  canRetry = () => true,
}: {
  name: string
  attempt: (attempt: 1 | 2) => Promise<T>
  restart: () => Promise<void>
  /**
   * Whether the first attempt's `error` may be retried: it is a driver fault, and the attempt has stopped
   * touching the device, so a second one cannot overlap it.
   */
  canRetry?: (error: unknown) => boolean
}): Promise<T> {
  try {
    return await attempt(1)
  } catch (error) {
    if (!canRetry(error)) throw error
    phase(`RETRY ${name}: ${errorRepr(error)}`)
    console.warn(
      `Driver fault in ${name}, restarting Chrome and typing again: ${errorRepr(error)}`,
    )
    await restart()
    return await attempt(2)
  }
}

/**
 * One attempt, cut off after `ATTEMPT_SECONDS` so a hung device call becomes a driver fault. A failed
 * attempt's screen dump and the uiautomator2 servers it started are stopped before it returns, so none of
 * its device calls overlap the retry.
 */
async function timedAttempt(
  name: string,
  options: TypeOnDeviceOptions,
): Promise<Typed> {
  assertNoUnstoppedProcess()
  resetPhaseClock()
  const stopWatchdog = watchdog(WATCHDOG_SECONDS)
  // Each attempt gets its own uiautomator2 server.
  const devices: Device[] = []
  const connect = async () => {
    const device = await Device.connect()
    devices.push(device)
    return device
  }
  phase(`start ${name}`)
  try {
    return await withDeadline(`attempt ${name}`, ATTEMPT_SECONDS, () =>
      typeInChrome(name, options, connect),
    )
  } catch (error) {
    await withDeadline('failure dump', FAILURE_DUMP_SECONDS, () =>
      dumpFailure(name, connect),
    ).catch((dumpError: unknown) =>
      phase(`failure dump stopped: ${errorRepr(dumpError)}`),
    )
    throw error
  } finally {
    stopWatchdog()
    await withDeadline(
      'stopping uiautomator2',
      SERVER_CLOSE_SECONDS,
      async () => {
        for (const device of devices) await device.close().catch(() => {})
      },
    ).catch((closeError: unknown) =>
      phase(`stopping uiautomator2 failed: ${errorRepr(closeError)}`),
    )
  }
}

/**
 * Stop Chrome. It runs under a signal of its own, so it also runs after the test's timeout aborted the
 * attempt.
 */
function cleanUpChrome(): Promise<void> {
  return runAbortable(new AbortController().signal, () =>
    withDeadline('cleanup', CLEANUP_SECONDS, closeChrome),
  )
}

function slug(testName: string): string {
  return testName
    .replace(/^Scenario: /, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
