// Type through Gboard's own keys into a page in Android Chrome and read the result back over CDP.
//
// A device test calls `typeOnDevice` or `runOnDevice` and asserts on what it returns. Both go through
// `drive`, which retries only driver faults. The one fault an attempt classifies from the typed text is a
// digit that neither the prefix nor the letters hold, see `throwOnUnexpectedDigit`.

import {mkdirSync} from 'node:fs'
import {TestRunner, type RunnerTestCase, type TestContext} from 'vitest'
import {assertNoUnstoppedProcess, unstoppedProcesses} from './device/adb.ts'
import {
  ATTEMPT_SECONDS,
  CLEANUP_SECONDS,
  FAILURE_DUMP_SECONDS,
  RESTART_SECONDS,
  SERVER_CLOSE_SECONDS,
} from './device/budget.ts'
import {PageExceptionError} from './device/cdp.ts'
import {Device} from './device/u2.ts'
import {
  errorRepr,
  GUARDED_INSPECTION,
  PLAIN_INSPECTION,
  phase,
  resetPhaseClock,
  runAbortable,
  runInspecting,
  watchdog,
  withDeadline,
  type Inspection,
} from './device/util.ts'
import {unsupportedNote} from './gboard/support.ts'
import {
  clearChromeTabs,
  closeChrome,
  dumpFailure,
  outDir,
  runInChrome,
  typeInChrome,
  withStepRecords,
  type TypeOnDeviceOptions,
  type Typed,
} from './gboard/typing.ts'
import type {Run, RunOnDeviceOptions, StepRecord} from './steps.ts'

export type {TypeOnDeviceOptions, Typed, Word} from './gboard/typing.ts'
export type {
  BackspaceStep,
  Commit,
  ComposeStep,
  EnterStep,
  GraphemeSelection,
  PageEvent,
  Run,
  RunOnDeviceOptions,
  Step,
  StepRecord,
  StepStatus,
} from './steps.ts'

const WATCHDOG_SECONDS = ATTEMPT_SECONDS - 15

/** One `typeOnDevice` or `runOnDevice` call and how it ended. */
type DriverRun = {
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
 * Every `typeOnDevice` and `runOnDevice` call in the current test file. `test.fails` counts any error, a timeout included, as
 * its expected failure, so the setup file `deviceProject` adds fails the file for a `test.fails` run that never completed.
 */
export const driverRuns: DriverRun[] = []

// The last call, which can still be stopping after its test timed out.
let previousRun: Promise<void> = Promise.resolve()

/**
 * Open `url` in a fresh Chrome, type `words` on Gboard and read back what the page holds. A driver fault
 * restarts Chrome and types everything again once. Artifacts go to `<outDir>/<keyboard>-<test name>*`.
 */
export async function typeOnDevice(
  options: TypeOnDeviceOptions,
): Promise<Typed> {
  const currentTest = TestRunner.getCurrentTest<RunnerTestCase | undefined>()
  if (!currentTest) {
    throw new Error('`typeOnDevice` runs inside a test')
  }
  return await drive(
    PLAIN_INSPECTION,
    options.keyboard,
    {
      name: currentTest.name,
      fails: Boolean(currentTest.fails),
      signal: currentTest.context.signal,
    },
    (name, connect) => typeInChrome(name, options, connect),
  )
}

/**
 * Open `url` in a fresh Chrome, drive `steps` on Gboard and return a record of each and what the page
 * holds after the last.
 *
 * `context` is the context Vitest passes to the test that calls it. The skip, the timeout, the artifact
 * names and the `driverRuns` record all belong to that test, also in a concurrent test. Only the context's
 * shape is checked, so the context of another test makes that test the owner of the call. `test.each`
 * passes no context, `test.for` does. Calls still drive the device one at a time, in the order they were
 * made, and a call's wait for the calls before it counts against its own test's timeout.
 *
 * Before it touches the device it checks that Gboard can drive every step on `keyboard`. When it cannot,
 * it skips the test with a note that names each step it cannot drive, its position, its type and why, so
 * a case never runs halfway. A call made after its test timed out or was cancelled is recorded `aborted`
 * against that test and rejects with the signal's reason, before it checks the steps or touches the
 * device. A step that throws is a driver fault, retried the way `typeOnDevice` retries one. When a step
 * of the last attempt threw, the call rejects with a new `Error` whose message is the step's error
 * message followed by a line per step of that attempt: its position, type, status, reason and
 * `textAfter`. Its `cause` is the value the step threw. Any other failure rejects with its error
 * unchanged. Artifacts go to `<outDir>/<keyboard>-<test name>*`.
 *
 * @example
 * ```ts
 * test('Scenario: Pressing Enter while kyou is composing', async (context) => {
 *   const run = await runOnDevice(context, {
 *     url: 'http://localhost:8765/editor.html',
 *     keyboard: 'en',
 *     prefix: '',
 *     steps: [
 *       {type: 'compose', letters: 'kyou', commit: 'none'},
 *       {type: 'enter'},
 *     ],
 *   })
 * })
 * ```
 */
export async function runOnDevice(
  context: TestContext,
  options: RunOnDeviceOptions,
): Promise<Run> {
  if (!isTestContext(context)) {
    throw new Error(
      '`runOnDevice` takes the context Vitest passes to the test first: `runOnDevice(context, options)`',
    )
  }
  if (context.signal.aborted) {
    // Its test already ended, so it may not skip it, and the device may belong to the next test.
    driverRuns.push({
      test: context.task.name,
      fails: Boolean(context.task.fails),
      state: 'aborted',
    })
    context.signal.throwIfAborted()
  }
  const note = unsupportedNote(options.steps, options.keyboard)
  if (note !== undefined) {
    context.skip(note)
  }
  // Each attempt gets its own outcome, so a step failure of an earlier attempt never describes a later one.
  // A restart that throws before the retry calls `runInChrome` leaves the first attempt's outcome, which
  // only describes the error its step threw.
  let lastAttempt: {failure?: {error: unknown; records: StepRecord[]}} = {}
  try {
    // A value a step throws and the signal's reason end up in its records and its error, never a
    // conversion error.
    return await drive(
      GUARDED_INSPECTION,
      options.keyboard,
      {
        name: context.task.name,
        fails: Boolean(context.task.fails),
        signal: context.signal,
      },
      (name, connect) => {
        const attempt: typeof lastAttempt = {}
        lastAttempt = attempt
        return runInChrome(name, options, connect, (error, records) => {
          attempt.failure = {error, records}
        })
      },
    )
  } catch (error) {
    const failure = lastAttempt.failure
    // `Object.is`, so a step that threw `NaN` is recognised.
    if (failure === undefined || !Object.is(failure.error, error)) {
      throw error
    }
    throw withStepRecords(error, failure.records)
  }
}

/**
 * Record the call in `driverRuns` against `test`, run `attempt` under the time bounds once every earlier
 * call settled, retry it once after a driver fault, and stop Chrome after it. Every thrown value and abort
 * reason of the call is read through `inspection`.
 */
async function drive<T>(
  inspection: Inspection,
  keyboard: RunOnDeviceOptions['keyboard'],
  test: {name: string; fails: boolean; signal: AbortSignal},
  attempt: (name: string, connect: () => Promise<Device>) => Promise<T>,
): Promise<T> {
  const run: DriverRun = {
    test: test.name,
    fails: test.fails,
    state: 'driving',
  }
  driverRuns.push(run)
  const name = `${keyboard}-${slug(test.name)}`
  mkdirSync(outDir(), {recursive: true})
  // Chained before the first await, so a call made while another is waiting still waits for it.
  const running = previousRun.then(() =>
    runInspecting(inspection, () =>
      driveAfterPrevious(inspection, run, name, test.signal, attempt),
    ),
  )
  previousRun = running.then(
    () => {},
    () => {},
  )
  return await running
}

async function driveAfterPrevious<T>(
  inspection: Inspection,
  run: DriverRun,
  name: string,
  testSignal: AbortSignal,
  attempt: (name: string, connect: () => Promise<Device>) => Promise<T>,
): Promise<T> {
  try {
    assertNoUnstoppedProcess()
  } catch (error) {
    run.state = 'faulted'
    throw error
  }
  const settle = (state: 'complete' | 'faulted' | 'page-exception') => {
    if (run.state === 'driving') {
      run.state = testSignal.aborted ? 'aborted' : state
    }
  }
  if (testSignal.aborted) {
    run.state = 'aborted'
  } else {
    testSignal.addEventListener(
      'abort',
      () => {
        if (run.state === 'driving') {
          run.state = 'aborted'
        }
      },
      {once: true},
    )
  }
  // A value that cannot be inspected is no page exception, so it is retried as a driver fault.
  const pageException = (error: unknown) =>
    inspection.guard(
      () => (error instanceof PageExceptionError ? error : undefined),
      undefined,
    )
  // A test that times out aborts its signal, which stops every device call of this run.
  return await runAbortable(testSignal, async () => {
    let result: T
    try {
      result = await withDriverRetry({
        name,
        attempt: (number) =>
          timedAttempt(
            number === 1 ? name : `${name}-retry`,
            inspection,
            attempt,
          ),
        restart: () =>
          withDeadline('restarting Chrome', RESTART_SECONDS, closeChrome),
        canRetry: (error) =>
          pageException(error) === undefined &&
          unstoppedProcesses().length === 0,
        describeError: inspection.describe,
      })
    } catch (error) {
      const thrownInPage = pageException(error)
      if (thrownInPage) {
        settle('page-exception')
        run.pageException = inspection.message(thrownInPage)
      } else {
        settle('faulted')
      }
      await cleanUpChrome().catch((cleanupError: unknown) =>
        phase(`cleanup failed: ${inspection.describe(cleanupError)}`),
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
    return result
  })
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
  describeError = errorRepr,
}: {
  name: string
  attempt: (attempt: 1 | 2) => Promise<T>
  restart: () => Promise<void>
  /**
   * Whether the first attempt's `error` may be retried: it is a driver fault, and the attempt has stopped
   * touching the device, so a second one cannot overlap it.
   */
  canRetry?: (error: unknown) => boolean
  /** How the retry's log lines show the first attempt's error. */
  describeError?: (error: unknown) => string
}): Promise<T> {
  try {
    return await attempt(1)
  } catch (error) {
    if (!canRetry(error)) {
      throw error
    }
    phase(`RETRY ${name}: ${describeError(error)}`)
    console.warn(
      `Driver fault in ${name}, restarting Chrome and typing again: ${describeError(error)}`,
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
async function timedAttempt<T>(
  name: string,
  inspection: Inspection,
  attempt: (name: string, connect: () => Promise<Device>) => Promise<T>,
): Promise<T> {
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
      attempt(name, connect),
    )
  } catch (error) {
    await withDeadline('failure dump', FAILURE_DUMP_SECONDS, () =>
      dumpFailure(name, connect),
    ).catch((dumpError: unknown) =>
      phase(`failure dump stopped: ${inspection.describe(dumpError)}`),
    )
    throw error
  } finally {
    stopWatchdog()
    await withDeadline(
      'stopping uiautomator2',
      SERVER_CLOSE_SECONDS,
      async () => {
        for (const device of devices) {
          await device.close().catch(() => {})
        }
      },
    ).catch((closeError: unknown) =>
      phase(`stopping uiautomator2 failed: ${inspection.describe(closeError)}`),
    )
  }
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

// Checks the public parts of `TestContext` that `runOnDevice` uses, so a call that passes its options
// first fails before it can skip or record anything.
function isTestContext(value: unknown): value is TestContext {
  if (
    (typeof value !== 'object' && typeof value !== 'function') ||
    value === null
  ) {
    return false
  }
  const context = value as Partial<Record<keyof TestContext, unknown>>
  return GUARDED_INSPECTION.guard(
    () =>
      context.signal instanceof AbortSignal &&
      typeof context.skip === 'function' &&
      typeof context.task === 'object' &&
      context.task !== null &&
      typeof (context.task as {name?: unknown}).name === 'string',
    false,
  )
}

function slug(testName: string): string {
  return testName
    .replace(/^Scenario: /, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
