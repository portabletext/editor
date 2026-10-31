// Type through Gboard's own keys into a page in Android Chrome and read the result back over CDP.
//
// A device test calls `typeOnDevice` and asserts on what it returns. The driver retries only driver
// faults. Besides a word's opt-in `expect`, the one fault it classifies from the typed text is a digit
// that neither the prefix nor the letters hold, see `typeInChrome`.

import {mkdirSync} from 'node:fs'
import {TestRunner, type RunnerTestCase} from 'vitest'
import {assertNoUnstoppedProcess, unstoppedProcesses} from './lib/adb.ts'
import {
  ATTEMPT_SECONDS,
  CLEANUP_SECONDS,
  FAILURE_DUMP_SECONDS,
  FAULT_READ_SECONDS,
  RECOVERY_SECONDS,
  RESTART_SECONDS,
  SERVER_CLOSE_SECONDS,
} from './lib/budget.ts'
import {PageExceptionError} from './lib/cdp.ts'
import {
  checkWords,
  clearChromeTabs,
  FaultWithPageErrors,
  closeChrome,
  dumpFailure,
  InconclusiveAttempt,
  OUT,
  typeInChrome,
  type AttemptCleanup,
  type CallInput,
  type PageErrorRecord,
  type TypeOnDeviceOptions,
  type Typed,
} from './lib/typing.ts'
import {Device} from './lib/u2.ts'
import {
  currentSignal,
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
  /** Whether the call named a `crash`. */
  crash: boolean
  /**
   * `driving` until the driver returned a result and cleaned up, `faulted` when it ended on a driver fault,
   * after one attempt or two.
   * `aborted` when the test timed out or was cancelled first, and no later cleanup changes it.
   * `page-exception` when an expression threw in the page, which can be an editor result and is never
   * retried.
   * `faulted-with-page-errors` when a driver fault ended typing after the page recorded errors, or the page
   * recorded an error other than the case's `crash`. It is never retried, so the errors are not typed
   * past, and never `complete`, since a flaky device is no proof of the editor's failure.
   * `inconclusive` when, in a case with a `crash`, a driver fault came once the page loaded and the read
   * after it did not return, or came after the case sent input, whatever the read showed. Whether the
   * page recorded the crash is unknown, so it is neither a crash reproduction nor an editor failure, and
   * it is never retried and never `complete`.
   */
  state:
    | 'driving'
    | 'complete'
    | 'faulted'
    | 'aborted'
    | 'page-exception'
    | 'faulted-with-page-errors'
    | 'inconclusive'
  /** The page's exception, for a `page-exception` run. */
  pageException?: string
  /** The fault and the page's errors, for a `faulted-with-page-errors` run. */
  faultWithPageErrors?: string
  /** What an `inconclusive` run means, the fault and why it leaves the page's errors unknown. */
  inconclusive?: string
  /** The page's errors in the result of a `complete` run. With a `crash`, every one matches it. */
  errors?: string[]
}

/**
 * Every `typeOnDevice` call in the current test file. `test.fails` counts any error, a timeout included, as
 * its expected failure, so `tests/setup.ts` fails the file for a `test.fails` run that never completed.
 */
export const driverRuns: DriverRun[] = []

// The last `typeOnDevice` call, which can still be stopping after its test timed out.
let previousRun: Promise<void> = Promise.resolve()

/**
 * Open `page` in a fresh Chrome, type `words` on Gboard and read back what the page holds. A driver fault
 * restarts Chrome and types everything again once. Artifacts go to `out/<lang>-<test name>*`.
 */
export async function typeOnDevice(
  options: TypeOnDeviceOptions,
): Promise<Typed> {
  const currentTest = TestRunner.getCurrentTest<RunnerTestCase | undefined>()
  if (!currentTest) throw new Error('`typeOnDevice` runs inside a test')
  const run: DriverRun = {
    test: currentTest.name,
    fails: Boolean(currentTest.fails),
    crash: options.crash !== undefined,
    state: 'driving',
  }
  driverRuns.push(run)
  const name = `${options.lang}-${slug(currentTest.name)}`
  mkdirSync(OUT, {recursive: true})
  await previousRun
  try {
    checkWords(options.words, options.crash)
    assertNoUnstoppedProcess()
  } catch (error) {
    run.state = 'faulted'
    throw error
  }
  const testSignal = currentTest.context.signal
  const settle = (
    state: Exclude<DriverRun['state'], 'driving' | 'aborted'>,
  ) => {
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
  const pageErrors: PageErrorRecord = {errors: []}
  const input: CallInput = {inputSent: false}
  // A test that times out aborts its signal, which stops every device call of this run.
  const running = runAbortable(testSignal, async () => {
    let typed: Typed
    try {
      typed = await withDriverRetry({
        name,
        attempt: (attempt) => {
          const attempted = timedAttempt(
            attempt === 1 ? name : `${name}-retry`,
            options,
            pageErrors,
            input,
          )
          // Without a `crash`, a fault is retried as it was before the page recorded errors, so a device
          // test that only reads the typed text keeps its second attempt.
          if (options.crash === undefined) return attempted
          return attempted.catch((error: unknown) =>
            keepPageErrors(error, pageErrors),
          )
        },
        restart: () =>
          withDeadline('restarting Chrome', RESTART_SECONDS, closeChrome),
        canRetry: (error) =>
          !(error instanceof PageExceptionError) &&
          unstoppedProcesses().length === 0 &&
          (options.crash === undefined ||
            (pageErrors.errors.length === 0 &&
              !(error instanceof FaultWithPageErrors) &&
              !(error instanceof InconclusiveAttempt))),
      })
    } catch (error) {
      if (error instanceof PageExceptionError) {
        settle('page-exception')
        run.pageException = error.message
      } else if (error instanceof FaultWithPageErrors) {
        settle('faulted-with-page-errors')
        run.faultWithPageErrors = error.message
      } else if (error instanceof InconclusiveAttempt) {
        settle('inconclusive')
        run.inconclusive = error.message
        console.warn(`${run.test}: ${error.message}`)
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
    if (run.state === 'complete') run.errors = typed.errors ?? []
    return typed
  })
  previousRun = running.then(
    () => {},
    () => {},
  )
  return running
}

/**
 * What a failed attempt ends on once the page recorded errors, whatever failed after the read that showed
 * them: the attempt's own result or fault when it classified one, so a failed cleanup after it changes
 * nothing, and otherwise the failure with the errors, which is never retried.
 */
function keepPageErrors(error: unknown, pageErrors: PageErrorRecord): Typed {
  if (pageErrors.errors.length === 0) throw error
  if (pageErrors.outcome !== undefined) {
    if ('typed' in pageErrors.outcome) return pageErrors.outcome.typed
    throw pageErrors.outcome.error
  }
  if (
    error instanceof PageExceptionError ||
    error instanceof FaultWithPageErrors
  )
    throw error
  throw new FaultWithPageErrors(error, pageErrors.errors)
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
 * attempt's page is read once before Gboard's return to its starting layout and the screen dump. All of
 * them and the uiautomator2 servers it started are stopped before it returns, so none of its device calls
 * overlap the retry.
 */
async function timedAttempt(
  name: string,
  options: TypeOnDeviceOptions,
  pageErrors: PageErrorRecord,
  input: CallInput,
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
  const cleanup: AttemptCleanup = {}
  phase(`start ${name}`)
  try {
    return await withDeadline(`attempt ${name}`, ATTEMPT_SECONDS, () =>
      typeInChrome(name, options, connect, pageErrors, cleanup, input),
    )
      .catch((fault: unknown) =>
        readAfterFault(fault, options, cleanup, pageErrors, input),
      )
      .finally(() => returnToStart(cleanup))
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
 * In a case with a `crash`, read the page once after the attempt failed with `fault`, once the attempt's
 * calls stopped and under a bound of its own, so the attempt's expired deadline cannot stop it. A read
 * that shows errors classifies them as the attempt would have. When the read fails, times out or is
 * skipped, whether the page recorded an error is unknown, so the call ends on `InconclusiveAttempt`
 * instead of a retry that could type past one. A read that shows none rethrows `fault` to be retried,
 * except once the case sent input: no read can show that none of it is still on its way to the page,
 * where it could record the crash only after the read.
 */
async function readAfterFault(
  fault: unknown,
  {crash}: TypeOnDeviceOptions,
  cleanup: AttemptCleanup,
  pageErrors: PageErrorRecord,
  input: CallInput,
): Promise<Typed> {
  const read = cleanup.readAfterFault
  // Without a `crash`, no read decides the retry. With one, the attempt failed before its page loaded, so
  // before any input.
  if (crash === undefined || read === undefined) throw fault
  // None of them is retried, and the attempt's own read classified what the page showed.
  if (
    fault instanceof PageExceptionError ||
    fault instanceof FaultWithPageErrors ||
    pageErrors.outcome !== undefined
  )
    throw fault
  // A read would touch the device after the test's timeout, or next to a process that outlived SIGKILL.
  if (currentSignal()?.aborted || unstoppedProcesses().length > 0)
    throw new InconclusiveAttempt(
      fault,
      input.inputSent,
      'and the page could not be read after it: Error: skipped after the test timed out or next to a process that outlived SIGKILL',
    )
  try {
    return await withDeadline(
      'reading the page after the fault',
      FAULT_READ_SECONDS,
      () => read(fault),
    )
  } catch (error) {
    if (error === fault && crash !== undefined && input.inputSent)
      throw new InconclusiveAttempt(
        fault,
        true,
        'and input the attempt sent may still reach the page, so a read without errors after it is no result',
      )
    if (
      error === fault ||
      error instanceof FaultWithPageErrors ||
      error instanceof PageExceptionError
    )
      throw error
    phase(`page unreadable after the fault: ${errorRepr(error)}`)
    throw new InconclusiveAttempt(
      fault,
      input.inputSent,
      `and the page could not be read after it: ${errorRepr(error)}`,
    )
  }
}

/**
 * Tap Gboard back to the layout typing started on, after the attempt's result or fault is settled and
 * under a bound of its own, so a hung tap back can neither outlast the attempt nor replace its outcome.
 * A failure is only logged.
 */
async function returnToStart(cleanup: AttemptCleanup): Promise<void> {
  const {returnToStart} = cleanup
  if (returnToStart === undefined) return
  await withDeadline(
    'returning to the starting layout',
    RECOVERY_SECONDS,
    returnToStart,
  ).catch((recoveryError: unknown) =>
    phase(
      `returning to the layout typing started on failed: ${errorRepr(recoveryError)}`,
    ),
  )
}

/**
 * Stop Chrome and delete its saved tabs, so the next test opens its page in a fresh Chrome. It runs under
 * a signal of its own, so it also runs after the test's timeout aborted the attempt.
 */
function cleanUpChrome(): Promise<void> {
  return runAbortable(new AbortController().signal, () =>
    withDeadline('cleanup', CLEANUP_SECONDS, async () => {
      await closeChrome()
      await clearChromeTabs()
    }),
  )
}

function slug(testName: string): string {
  return testName
    .replace(/^Scenario: /, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
