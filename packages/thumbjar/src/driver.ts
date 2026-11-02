// Type through Gboard's own keys into a page in Android Chrome and read the result back over CDP.
//
// A device test calls `typeOnDevice` or `runOnDevice` and asserts on what it returns. Both go through
// `drive`, which retries only driver faults, and `runOnDevice` only the way `strictRetry` allows. The one
// fault an attempt classifies from the typed text is a digit that neither the prefix nor the letters hold,
// see `throwOnUnexpectedDigit`.

import {mkdirSync} from 'node:fs'
import {TestRunner, type RunnerTestCase, type TestContext} from 'vitest'
import {
  assertNoUnstoppedProcess,
  DeviceLost,
  ProcessNotStoppedError,
  runNotStrict,
  runStrict,
  thrownValue,
  unstoppedProcesses,
} from './device/adb.ts'
import {
  ATTEMPT_SECONDS,
  CLEANUP_SECONDS,
  DEVICE_STATE_READ_SECONDS,
  FAILURE_DUMP_SECONDS,
  FAULT_READ_SECONDS,
  FRESH_RESTART_SECONDS,
  RESTART_SECONDS,
  SERVER_CLOSE_SECONDS,
} from './device/budget.ts'
import {PageExceptionError} from './device/cdp.ts'
import {Device} from './device/u2.ts'
import {
  currentInspection,
  currentSignal,
  describeError,
  errorRepr,
  GUARDED_INSPECTION,
  isInstance,
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
  adbLostDevice,
  ChromeNotRestarted,
  closeChrome,
  dumpFailure,
  outDir,
  readDeviceState,
  runInChrome,
  stopChromeForRetry,
  typeInChrome,
  withStepRecords,
  type AdbLoss,
  type AttemptHooks,
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
export type DriverRun = {
  test: string
  fails: boolean
  /**
   * `driving` until the driver returned a result and cleaned up, `faulted` when it ended on a driver fault,
   * after one attempt or two. A second attempt's timeout before any input stays `faulted` whatever `adb get-state`
   * answers, unless the read completed with an answer other than `device`, and carries neither marker below.
   * One after input ends `inconclusive` instead, and is marked `deviceUnconfirmed` when the first attempt
   * already used the call's one state read.
   * `aborted` when the test timed out or was cancelled first, and no later cleanup changes it. For
   * `runOnDevice`, a timeout while the driver still decides whether to retry a first attempt's fault before
   * any input ends on what that fault would end the call on if it were final instead: `inconclusive` for a
   * timeout and `faulted` for any other fault.
   * `page-exception` when an expression threw in the page, which can be an editor result and is never
   * retried. It takes precedence over every other state here, including when the read of the page after
   * a failed step raised it.
   * `inconclusive`, for `runOnDevice` only, when a driver fault came after the attempt sent input, which
   * may still reach a page a retry would type into, when the restart before the retry could not show
   * a fresh Chrome, or when the test timed out while the driver decided whether to retry a first attempt's
   * timeout before any input. The call says nothing about the page and is never retried.
   * `device-offline`, for `runOnDevice` only, when an adb call of any step failed on adb's own error for a
   * lost device, the restart's force-stop included, which its `reason` quotes, or timed out and the `adb get-state` read for that timeout completed with an
   * answer other than `device`. It is never retried on that device.
   */
  state:
    | 'driving'
    | 'complete'
    | 'faulted'
    | 'aborted'
    | 'page-exception'
    | 'inconclusive'
    | 'device-offline'
  /** The page's exception, for a `page-exception` run. */
  pageException?: string
  /** Why an `inconclusive` or `device-offline` run ended there. */
  reason?: string
  /**
   * Whether an adb call of an `inconclusive` run timed out and `adb get-state` then answered `device`, so
   * it is not counted as device offline. That read can come after the device was already back.
   */
  deviceAnswered?: true
  /**
   * Whether an adb call of an `inconclusive` run timed out and the `adb get-state` after it was stopped or
   * skipped, so whether adb still reached the device is unknown and it is not counted as device offline.
   */
  deviceUnconfirmed?: true
}

/**
 * Every `typeOnDevice` and `runOnDevice` call in the current test file. `test.fails` counts any error, a timeout included, as
 * its expected failure, so the setup file `deviceProject` adds fails the file for a `test.fails` run that never completed,
 * and counts each test by its last call in the job summary.
 */
export const driverRuns: DriverRun[] = []

// The test each run belongs to, kept apart from the record so a run's shape stays the same. Two tests can
// share a name, in two `describe` blocks for instance.
const runTasks = new WeakMap<DriverRun, object>()

/** The last `driverRuns` record of `task`, the Vitest test that made the call, which ended it. */
export function lastDriverRun(task: object): DriverRun | undefined {
  return driverRuns.findLast((run) => runTasks.get(run) === task)
}

// The last call, which can still be stopping after its test timed out.
let previousRun: Promise<void> = Promise.resolve()

/**
 * Open `url` in Chrome, which is stopped and started again for each test, picking the page by its exact
 * URL. Type `words` on Gboard and read back what the page holds. A driver fault restarts Chrome and types
 * everything again once. Artifacts go to `<outDir>/<keyboard>-<test name>*`.
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
      task: currentTest,
    },
    (name, connect) => typeInChrome(name, options, connect),
  )
}

/**
 * Open `url` in Chrome, which is stopped and started again for each test, picking the page by its exact
 * URL. Drive `steps` on Gboard and return a record of each and what the page holds after the last.
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
 * device.
 *
 * A step that throws is a driver fault. After it, the page's text, selection and focus are read into the
 * step's record, on a clock of their own once the attempt stopped. A fault that came before the attempt
 * sent any input is retried once, only after the old Chrome stopped and only into a Chrome whose pid is
 * new. A fault after input, a restart that cannot show a fresh Chrome, and an adb call that means adb lost
 * the device are never retried, and the call's `driverRuns` record says `inconclusive` or
 * `device-offline` and why. When a step of the last attempt threw, the call rejects with a new `Error`
 * whose message is the step's error message followed by a line per step of that attempt: its position,
 * type, status, reason and `textAfter`. Its `cause` is the value the step threw. Any other failure
 * rejects with its error unchanged. Artifacts go to `<outDir>/<keyboard>-<test name>*`.
 *
 * @example
 * ```ts
 * import {runOnDevice} from 'thumbjar'
 * import {test} from 'vitest'
 *
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
    const run: DriverRun = {
      test: context.task.name,
      fails: Boolean(context.task.fails),
      state: 'aborted',
    }
    driverRuns.push(run)
    runTasks.set(run, context.task)
    context.signal.throwIfAborted()
  }
  const note = unsupportedNote(options.steps, options.keyboard)
  if (note !== undefined) {
    context.skip(note)
  }
  // Each attempt keeps its own failure, so a step failure of an earlier attempt never describes a later
  // one. A retry that refuses its restarted Chrome ends the call on the first attempt's fault, so the
  // records are the latest attempt's that threw the error the call throws, never merely the latest.
  const attempts: {
    thrown?: {error: unknown}
    failure?: {error: unknown; records: StepRecord[]}
  }[] = []
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
        task: context.task,
      },
      (name, connect, hooks) => {
        const attempt: (typeof attempts)[number] = {}
        attempts.push(attempt)
        return runInChrome(
          name,
          options,
          connect,
          (error, records) => {
            attempt.failure = {error, records}
          },
          hooks,
        ).catch((error: unknown) => {
          attempt.thrown = {error}
          throw error
        })
      },
      true,
    )
  } catch (error) {
    // `Object.is`, so a step that threw `NaN` is recognised.
    const failure = attempts.findLast(
      (attempt) =>
        attempt.thrown !== undefined && Object.is(attempt.thrown.error, error),
    )?.failure
    if (failure === undefined || !Object.is(failure.error, error)) {
      throw thrownValue(error)
    }
    throw withStepRecords(thrownValue(error), failure.records)
  }
}

/**
 * Record the call in `driverRuns` against `test`, run `attempt` under the time bounds once every earlier
 * call settled, retry it once after a driver fault, and stop Chrome after it. Every thrown value and abort
 * reason of the call is read through `inspection`. A `strict` call, `runOnDevice`'s, passes each attempt
 * its `AttemptHooks` and retries only the way `strictRetry` allows.
 */
async function drive<T>(
  inspection: Inspection,
  keyboard: RunOnDeviceOptions['keyboard'],
  test: {name: string; fails: boolean; signal: AbortSignal; task: object},
  attempt: Attempt<T>,
  strict = false,
): Promise<T> {
  const run: DriverRun = {
    test: test.name,
    fails: test.fails,
    state: 'driving',
  }
  driverRuns.push(run)
  runTasks.set(run, test.task)
  const name = `${keyboard}-${slug(test.name)}`
  mkdirSync(outDir(), {recursive: true})
  // Chained before the first await, so a call made while another is waiting still waits for it. The
  // callback runs in the context that queued the call, a step's getter of a `runOnDevice` call for
  // instance, so it sets the call's own inspection and leaves any strict scope before it starts.
  const running = previousRun.then(() =>
    runNotStrict(() =>
      runInspecting(inspection, () =>
        driveAfterPrevious(inspection, run, name, test.signal, attempt, strict),
      ),
    ),
  )
  previousRun = running.then(
    () => {},
    () => {},
  )
  return await running
}

type Attempt<T> = (
  name: string,
  connect: () => Promise<Device>,
  hooks?: AttemptHooks,
) => Promise<T>

async function driveAfterPrevious<T>(
  inspection: Inspection,
  run: DriverRun,
  name: string,
  testSignal: AbortSignal,
  attempt: Attempt<T>,
  strict: boolean,
): Promise<T> {
  try {
    assertNoUnstoppedProcess()
  } catch (error) {
    run.state = 'faulted'
    throw error
  }
  const settle = (
    state: Exclude<DriverRun['state'], 'driving' | 'aborted'>,
  ) => {
    if (run.state === 'driving') {
      run.state = testSignal.aborted ? 'aborted' : state
    }
  }
  let recorded = false
  // The outcome a strict call ends on when the test times out while it still decides whether to retry a
  // failed attempt, from that attempt's fault. Work for the retry itself ends `aborted`.
  let pending: TerminalOutcome | undefined
  // A strict call's outcome, recorded once the moment the attempt that ends the call failed, before any
  // diagnostic. A diagnostic can then only add to it: a completed state read may turn `inconclusive` or
  // `faulted` into `device-offline` and add its markers, so no diagnostic's time can turn the outcome into
  // an abort.
  const record = (outcome: TerminalOutcome) => {
    if (!recorded) {
      if (run.state !== 'driving') {
        return
      }
      recorded = true
      pending = undefined
      run.state = outcome.state
    } else if (
      (run.state === 'inconclusive' || run.state === 'faulted') &&
      outcome.state === 'device-offline'
    ) {
      run.state = 'device-offline'
    } else if (
      (run.state === 'inconclusive' ||
        run.state === 'faulted' ||
        run.state === 'device-offline') &&
      outcome.state === 'page-exception'
    ) {
      run.state = 'page-exception'
      delete run.reason
      delete run.deviceAnswered
      delete run.deviceUnconfirmed
    } else if (run.state !== outcome.state) {
      return
    }
    if (outcome.reason !== undefined) {
      run.reason = outcome.reason
    }
    if (outcome.pageException !== undefined) {
      run.pageException = outcome.pageException
    }
    if (outcome.deviceAnswered) {
      run.deviceAnswered = true
    }
    if (outcome.deviceUnconfirmed) {
      run.deviceUnconfirmed = true
    }
    if (outcome.reason !== undefined) {
      console.warn(`${run.test}: ${outcome.reason}`)
    }
  }
  const pend = (outcome: TerminalOutcome | undefined) => {
    pending = recorded ? undefined : outcome
  }
  const settleAbort = () => {
    if (pending !== undefined) {
      record(pending)
    } else if (run.state === 'driving') {
      run.state = 'aborted'
    }
  }
  // A failure the strict call already began to classify settles on that classification, even when reading
  // the thrown value aborts the test's signal.
  let classifying = false
  let abortedWhileClassifying = false
  const classify = (decide: () => void) => {
    classifying = true
    try {
      decide()
    } finally {
      classifying = false
      if (abortedWhileClassifying) {
        abortedWhileClassifying = false
        settleAbort()
      }
    }
  }
  if (testSignal.aborted) {
    run.state = 'aborted'
  } else {
    testSignal.addEventListener(
      'abort',
      () => {
        if (classifying) {
          abortedWhileClassifying = true
        } else {
          settleAbort()
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
      result = strict
        ? await strictRetry(
            name,
            inspection,
            attempt,
            pageException,
            record,
            pend,
            classify,
          )
        : await withDriverRetry({
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
      if (recorded) {
        // The strict call recorded its outcome when the attempt failed.
      } else if (thrownInPage) {
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
 * How a `runOnDevice` call ended when an attempt failed and the call will not retry it, and what the
 * diagnostics after it found.
 */
type TerminalOutcome = {
  state: 'inconclusive' | 'device-offline' | 'faulted' | 'page-exception'
  reason?: string
  pageException?: string
  deviceAnswered?: boolean
  deviceUnconfirmed?: boolean
}

/**
 * `runOnDevice`'s retry. A fault after the attempt sent input is `inconclusive`, and a failed adb call that
 * means adb lost the device is `device-offline`, and neither is retried. Any other fault is retried once,
 * only after the old Chrome stopped and only into a Chrome whose pid is new, and a restart or a check that
 * cannot show that ends the call `inconclusive`, or `device-offline` when adb lost the device.
 *
 * The moment an attempt fails, before its failure dump, `classify` runs `terminalOutcome`, which reads the
 * fault once and decides from it alone whether the call ends there, and if so passes the outcome to
 * `record`. A `DeviceLost` a helper threw was already read when the helper recognised it, so it is never
 * read again. An exception escaping that classification ends the call, `inconclusive` after input and
 * `faulted` before it. A fault whose guarded read cannot convert it counts as unreadable, and before input
 * keeps the retry policy above. Only then do the diagnostics run: the failure dump, the call's one `adb get-state` and the read of the page into the failed step's record,
 * each under a bound of its own. A state read can only add to the recorded outcome. A first attempt's fault
 * before input that the call may retry records nothing, but until the retry's restart begins `pend` holds
 * the outcome a test timeout ends it on, the one it would end on if that fault were final: `inconclusive`
 * and unconfirmed for a timeout, whose retry also waits for the state read, and `faulted` for any other
 * fault. The call always rejects with the attempt's own fault.
 */
async function strictRetry<T>(
  name: string,
  inspection: Inspection,
  attempt: Attempt<T>,
  pageException: (error: unknown) => PageExceptionError | undefined,
  record: (outcome: TerminalOutcome) => void,
  pend: (outcome: TerminalOutcome | undefined) => void,
  classify: (decide: () => void) => void,
): Promise<T> {
  let previousChrome: string[] | undefined
  const state = oneDeviceStateRead()
  const run = async (number: 1 | 2) => {
    const hooks: AttemptHooks = {inputSent: false}
    if (previousChrome !== undefined) {
      hooks.previousChrome = previousChrome
    }
    let ended: TerminalOutcome | undefined
    let undecided: string | undefined
    let lost: AdbLoss | undefined
    try {
      return await timedAttempt(
        number === 1 ? name : `${name}-retry`,
        inspection,
        // Only the attempt's own work and the restart run strict. The failure dump and the other diagnostics
        // run once the outcome is recorded, and can only add to it.
        (attemptName, connect) =>
          runStrict(() => attempt(attemptName, connect, hooks)),
        (fault) =>
          classify(() => {
            try {
              const classified = terminalOutcome(
                fault,
                hooks,
                number,
                inspection,
                pageException,
              )
              ended = classified.ended
              lost = classified.lost
            } catch {
              // Only a hostile thrown value gets here, and it must not reopen a retry after input.
              lost = undefined
              ended = hooks.inputSent ? afterInput() : {state: 'faulted'}
            }
            if (ended !== undefined) {
              record(ended)
            } else if (lost === 'timeout') {
              undecided = `the test timed out while the driver decided whether to retry a timeout before any input: ${inspection.describe(fault)}`
              pend({
                state: 'inconclusive',
                reason: undecided,
                deviceUnconfirmed: true,
              })
            } else {
              pend({state: 'faulted'})
            }
          }),
      )
    } catch (fault) {
      if (ended?.state !== 'page-exception' && lost === 'timeout') {
        const answer = await state({})
        if (answer !== undefined && answer !== 'device') {
          ended = offlineByState(answer)
          record(ended)
        } else if (ended?.state === 'inconclusive') {
          ended =
            answer === 'device'
              ? {...ended, deviceAnswered: true}
              : {...ended, deviceUnconfirmed: true}
          record(ended)
        } else if (undecided !== undefined && answer === 'device') {
          pend({state: 'inconclusive', reason: undecided, deviceAnswered: true})
        }
      }
      const readException = await readAfterFault(hooks, pageException)
      if (readException !== undefined) {
        // The page's exception is the code under test's own, so the read of the page ends the call on it
        // exactly as the same exception at a step boundary does, and no retry can hide it.
        ended = pageExceptionOutcome(readException, inspection)
        record(ended)
      }
      // A test that timed out before the retry began recorded the outcome `pend` held, if any, or the abort.
      throw ended === undefined && !currentSignal()?.aborted
        ? fault
        : new EndedCall(fault)
    }
  }
  try {
    return await run(1)
  } catch (thrown) {
    if (isInstance(thrown, EndedCall)) {
      throw thrown.fault
    }
    const fault = thrown
    pend(undefined)
    phase(`RETRY ${name}: ${inspection.describe(fault)}`)
    console.warn(
      `Driver fault in ${name}, restarting Chrome and typing again: ${inspection.describe(fault)}`,
    )
    try {
      previousChrome = await withDeadline(
        'restarting Chrome',
        FRESH_RESTART_SECONDS,
        () => runStrict(stopChromeForRetry),
      )
    } catch (restartError) {
      throwIfUnstopped(restartError)
      if (isInstance(restartError, DeviceLost)) {
        record(offlineByAdb(restartError.adbError))
        throw fault
      }
      const lost = lostDevice(restartError)
      if (lost !== undefined && lost !== 'timeout') {
        record(offlineByAdb(lost.adbError))
        throw fault
      }
      const ended: TerminalOutcome = {
        state: 'inconclusive',
        reason: `the restart before the retry did not show a fresh Chrome: ${
          isInstance(restartError, ChromeNotRestarted)
            ? restartError.message
            : inspection.describe(restartError)
        }`,
      }
      record(ended)
      if (lost === 'timeout') {
        const answer = await state({})
        record(
          answer === undefined
            ? {...ended, deviceUnconfirmed: true}
            : answer === 'device'
              ? {...ended, deviceAnswered: true}
              : offlineByState(answer),
        )
      }
      throw fault
    }
    try {
      return await run(2)
    } catch (retryThrown) {
      const retryFault = isInstance(retryThrown, EndedCall)
        ? retryThrown.fault
        : retryThrown
      // The retry never typed, so the fault the call ends on is the first attempt's.
      throw isInstance(retryFault, ChromeNotRestarted) ? fault : retryFault
    }
  }
}

/**
 * The outcome an attempt that failed with `fault` ends the call on, decided from the fault alone, with no
 * device call, or no `ended` when the call may still retry it: a fault before input on the first attempt,
 * which a timeout leaves to the state read. adb's own error for a lost device is `device-offline` here,
 * since adb itself said so. `lost` is how adb may have lost the device, read once for the whole failure.
 */
function terminalOutcome(
  fault: unknown,
  hooks: AttemptHooks,
  number: 1 | 2,
  inspection: Inspection,
  pageException: (error: unknown) => PageExceptionError | undefined,
): {ended: TerminalOutcome | undefined; lost: AdbLoss | undefined} {
  const thrownInPage = pageException(fault)
  if (thrownInPage !== undefined) {
    return {
      ended: pageExceptionOutcome(thrownInPage, inspection),
      lost: undefined,
    }
  }
  if (isInstance(fault, DeviceLost)) {
    return {ended: offlineByAdb(fault.adbError), lost: undefined}
  }
  const lost = lostDevice(fault)
  if (lost !== undefined && lost !== 'timeout') {
    return {ended: offlineByAdb(lost.adbError), lost}
  }
  if (isInstance(fault, ChromeNotRestarted)) {
    return {
      ended: {
        state: 'inconclusive',
        reason: `the restart before the retry did not show a fresh Chrome: ${inspection.message(fault)}`,
      },
      lost,
    }
  }
  if (hooks.inputSent) {
    return {ended: afterInput(), lost}
  }
  if (number === 2 || unstoppedProcesses().length > 0) {
    return {ended: {state: 'faulted'}, lost}
  }
  return {ended: undefined, lost}
}

function pageExceptionOutcome(
  thrownInPage: PageExceptionError,
  inspection: Inspection,
): TerminalOutcome {
  return {
    state: 'page-exception',
    pageException: inspection.message(thrownInPage),
  }
}

function afterInput(): TerminalOutcome {
  return {
    state: 'inconclusive',
    reason: 'the driver faulted after it sent input, so it was not retried',
  }
}

/** A call adb's own error for a lost device ended, quoting that error. */
function offlineByAdb(adbError: string): TerminalOutcome {
  return {
    state: 'device-offline',
    reason: `adb lost the device, so it was not retried: ${adbError}`,
  }
}

/** A call whose timeout the completed `adb get-state` read answered with something other than `device`. */
function offlineByState(answer: string): TerminalOutcome {
  return {
    state: 'device-offline',
    reason: `adb lost the device (adb get-state: ${answer}), so it was not retried`,
  }
}

/** How `fault` failed when adb may have lost the device, for a pid read the retry's check threw as well. */
function lostDevice(fault: unknown): AdbLoss | undefined {
  return isInstance(fault, ChromeNotRestarted)
    ? currentInspection().guard(() => fault.lost, undefined)
    : adbLostDevice(fault)
}

/** Carries the fault of an attempt whose outcome already ended the call, so it is not retried. */
class EndedCall {
  readonly fault: unknown
  constructor(fault: unknown) {
    this.fault = fault
  }
}

/**
 * The read of the page after a failed attempt, which never replaces the attempt's fault. Returns the
 * exception the page threw during the read, the only error of it that is not a diagnostic.
 */
async function readAfterFault(
  hooks: AttemptHooks,
  pageException: (error: unknown) => PageExceptionError | undefined,
): Promise<PageExceptionError | undefined> {
  const read = hooks.readAfterFault
  if (read === undefined) {
    return undefined
  }
  if (currentSignal()?.aborted || unstoppedProcesses().length > 0) {
    // A read would touch the device after the test's timeout, or next to a process that outlived SIGKILL.
    phase(
      'page not read after the fault: the test timed out or a process outlived SIGKILL',
    )
    return undefined
  }
  return await withDeadline(
    'reading the page after the fault',
    FAULT_READ_SECONDS,
    read,
  ).then(
    () => undefined,
    (readError: unknown) => {
      phase(`page unreadable after the fault: ${describeError(readError)}`)
      return pageException(readError)
    },
  )
}

/**
 * The call's one `adb get-state`, under its own bound, so no deadline of the attempt or the restart stops
 * it. Each failure passes a fresh `failure` token, never its thrown value, which a later failure can throw
 * again. The answer describes only the failure it was read for: a later failure of the same call gets
 * `undefined`, an unconfirmed device, never an earlier `device`.
 */
function oneDeviceStateRead(): (
  failure: object,
) => Promise<string | undefined> {
  let read: {failure: object; answer: Promise<string | undefined>} | undefined
  return (failure) => {
    read ??= {failure, answer: deviceState()}
    return read.failure === failure ? read.answer : Promise.resolve(undefined)
  }
}

function deviceState(): Promise<string | undefined> {
  return withDeadline(
    'adb get-state',
    DEVICE_STATE_READ_SECONDS,
    readDeviceState,
  ).catch((readError: unknown) => {
    throwIfUnstopped(readError)
    phase(`adb get-state stopped: ${describeError(readError)}`)
    return undefined
  })
}

/** Rethrow `error` when it, or any process before it, outlived SIGKILL. */
function throwIfUnstopped(error: unknown): void {
  if (isInstance(error, ProcessNotStoppedError)) {
    throw error
  }
  assertNoUnstoppedProcess()
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
  attempt: Attempt<T>,
  onFailure?: (fault: unknown) => void,
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
    onFailure?.(error)
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
 * Stop Chrome. It runs under a signal of its own, so it also runs after the test's timeout aborted the
 * attempt.
 */
function cleanUpChrome(): Promise<void> {
  return runAbortable(new AbortController().signal, () =>
    withDeadline('cleanup', CLEANUP_SECONDS, closeChrome),
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
