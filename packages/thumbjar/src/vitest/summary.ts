// A device test file's lines in the job summary, which the setup file `deviceProject` adds writes to
// its `summaryFile` after the file's tests.

import {stripVTControlCharacters} from 'node:util'
import type {DriverRun} from '../driver.ts'

const OUTCOMES = [
  'passed',
  'failed',
  'expected failure',
  'inconclusive',
  'device offline',
  'driver fault',
] as const

export type Outcome = (typeof OUTCOMES)[number]

/**
 * The line under a file's summary line when a failure was not counted as device offline because the one
 * `adb get-state` after it answered `device`. That read can come after the device was already back.
 */
const DEVICE_ANSWERED_NOTE =
  'Not counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.'

/**
 * The line under a file's summary line when a failure was not counted as device offline because the one
 * `adb get-state` after it was stopped or skipped, so it never showed whether adb still reached the device.
 */
const DEVICE_UNCONFIRMED_NOTE =
  'Could not check whether the device was reachable, so the device offline count can be too low.'

/**
 * A test's outcome from its final result and the last driver call it made, the call that ended it. An
 * inconclusive call, a lost device and a driver fault are counted apart from a failure, since none says
 * anything about the page.
 */
export function testOutcome({
  passed,
  fails,
  run,
}: {
  passed: boolean
  /** Whether the test is marked `test.fails`. */
  fails: boolean
  run: DriverRun | undefined
}): Outcome {
  if (run?.state === 'inconclusive') {
    return 'inconclusive'
  }
  if (run?.state === 'device-offline') {
    return 'device offline'
  }
  if (
    run?.state === 'faulted' ||
    run?.state === 'aborted' ||
    run?.state === 'driving'
  ) {
    // A call that timed out or never cleaned up failed no assertion either.
    return 'driver fault'
  }
  if (!passed || run?.state === 'page-exception') {
    return 'failed'
  }
  return fails ? 'expected failure' : 'passed'
}

/**
 * The keys the driver sent and the events the page recorded, one pair of lines per step, for a failed
 * test, so a key that never reached the page shows beside the events that did.
 */
export function tapsBlock(
  testName: string,
  taps: NonNullable<DriverRun['taps']>,
): string {
  const steps = taps.flatMap((step, index) => {
    const label = `step ${index + 1}: `
    const events = step.events.map((event) =>
      [
        event.type,
        event.inputType,
        event.data === undefined || event.data === null
          ? undefined
          : JSON.stringify(event.data),
      ]
        .filter((part) => part !== undefined && part !== null)
        .join(' '),
    )
    return [
      `  ${label}sent ${step.keys.length > 0 ? step.keys.join(' ') : '(none)'}`,
      `  ${' '.repeat(label.length)}page ${events.length > 0 ? events.join(', ') : '(none)'}`,
    ]
  })
  return [`Taps sent and page events for "${testName}":`, ...steps].join('\n')
}

/**
 * How many tests of `file` ended in each outcome, a table row per test, then each note whose condition
 * one of `runs` meets, the mistap retries among them, and the taps of each failed test.
 * A test that did not run has no `outcome`.
 */
export function summaryLines(
  file: string,
  tests: Array<{
    name: string
    /** In milliseconds. */
    duration?: number | undefined
    /** The test's first error, preferred over `pageException` and `reason` in the Failure column. */
    errorMessage?: string | undefined
    /** The exception from the test's last driver call, preferred over `reason`. */
    pageException?: string | undefined
    /** Why the test's last driver call ended inconclusive, offline or faulted. */
    reason?: string | undefined
    outcome: Outcome | undefined
    /** The taps of a failed test, printed after the table and notes. */
    taps?: DriverRun['taps']
    /** The name that heads the taps block, the test's own name without its suites. `name` when not given. */
    tapsName?: string
  }>,
  runs: DriverRun[],
): string {
  const counts = OUTCOMES.map(
    (outcome) =>
      `${tests.filter((test) => test.outcome === outcome).length} ${outcome}`,
  )
  const table = [
    '| # | Test | Outcome | Duration | Failure |',
    '| --- | --- | --- | --- | --- |',
    ...tests.map((test, index) => {
      const failure =
        test.outcome === 'failed' ||
        test.outcome === 'inconclusive' ||
        test.outcome === 'device offline' ||
        test.outcome === 'driver fault'
          ? (stripVTControlCharacters(
              test.errorMessage ?? test.pageException ?? test.reason ?? '',
            ).split(/\r\n|[\n\r\u2028\u2029]/)[0] ?? '')
          : ''
      return `| ${[
        String(index + 1),
        test.name,
        test.outcome ?? 'not run',
        test.outcome !== undefined && test.duration !== undefined
          ? `${(test.duration / 1000).toFixed(1)} s`
          : '',
        failure.length > 200 ? `${failure.slice(0, 199)}…` : failure,
      ]
        .map(tableCell)
        .join(' | ')} |`
    }),
  ].join('\n')
  const mistaps = new Map<string, number>()
  for (const run of runs) {
    if (run.mistapRetries) {
      mistaps.set(run.test, (mistaps.get(run.test) ?? 0) + run.mistapRetries)
    }
  }
  const retryCount = [...mistaps.values()].reduce(
    (total, count) => total + count,
    0,
  )
  const notes = [
    ...(retryCount > 0
      ? [
          `${retryCount} mistap retries (${[...mistaps].map(([name, count]) => `"${name}": ${count}`).join(', ')})`,
        ]
      : []),
    ...(runs.some((run) => run.deviceAnswered) ? [DEVICE_ANSWERED_NOTE] : []),
    ...(runs.some((run) => run.deviceUnconfirmed)
      ? [DEVICE_UNCONFIRMED_NOTE]
      : []),
  ]
  return [
    `\`${file}\`: ${counts.join(', ')}`,
    table,
    ...notes,
    ...tests.flatMap((test) =>
      test.taps === undefined
        ? []
        : [tapsBlock(test.tapsName ?? test.name, test.taps)],
    ),
  ]
    .map((line) => `${line}\n`)
    .concat('')
    .join('\n')
}

function tableCell(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replace(/[\r\n\u2028\u2029]+/g, ' ')
    .replaceAll('`', "'")
}
