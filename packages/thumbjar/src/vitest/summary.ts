// A device test file's lines in the job summary, which the setup file `deviceProject` adds writes to
// its `summaryFile` after the file's tests.

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
 * How many tests of `file` ended in each outcome, and which, then the tests that did not run, skipped or
 * todo, on a line of their own when there are any, and each note whose condition one of `runs` meets. A
 * test that did not run has no `outcome`.
 */
export function summaryLines(
  file: string,
  tests: Array<{
    name: string
    outcome: Outcome | undefined
    /** The taps of a failed test, printed under the counts. */
    taps?: DriverRun['taps']
  }>,
  runs: DriverRun[],
): string {
  const counts = OUTCOMES.map((outcome) => {
    const names = tests
      .filter((test) => test.outcome === outcome)
      .map((test) => `"${test.name}"`)
    return names.length > 0
      ? `${names.length} ${outcome} (${names.join(', ')})`
      : `0 ${outcome}`
  })
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
  const notRun = tests
    .filter((test) => test.outcome === undefined)
    .map((test) => `"${test.name}"`)
  return [
    `\`${file}\`: ${counts.join(', ')}`,
    ...(notRun.length > 0
      ? [`${notRun.length} not run, skipped or todo (${notRun.join(', ')})`]
      : []),
    ...notes,
    ...tests.flatMap((test) =>
      test.taps === undefined ? [] : [tapsBlock(test.name, test.taps)],
    ),
  ]
    .map((line) => `${line}\n`)
    .join('\n')
}
