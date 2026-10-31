// The file's line in the job summary, which `tests/setup.ts` writes after the tests and
// `scripts/prep-summary.ts` when the prep failed on a device adb lost.

const OUTCOMES = [
  'passed',
  'failed',
  'expected crash reproduced',
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
export const DEVICE_ANSWERED_NOTE =
  'Not counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.'

/**
 * The line under a file's summary line when a failure was not counted as device offline because the one
 * `adb get-state` after it was stopped or skipped, so it never showed whether adb still reached the device.
 */
export const DEVICE_UNCONFIRMED_NOTE =
  'Could not check whether the device was reachable, so the device offline count can be too low.'

/** How many tests of `file` ended in each outcome, and which. */
export function summaryLine(
  file: string,
  tests: Array<{name: string; outcome: Outcome}>,
): string {
  const counts = OUTCOMES.map((outcome) => {
    const names = tests
      .filter((test) => test.outcome === outcome)
      .map((test) => `"${test.name}"`)
    return names.length > 0
      ? `${names.length} ${outcome} (${names.join(', ')})`
      : `0 ${outcome}`
  })
  return `\`${file}\`: ${counts.join(', ')}`
}

/**
 * The names of a device test file's top-level `test(` and `test.fails(` calls, each a single-quoted string
 * as in every device test file. A unit test checks them against the names Vitest collects.
 */
export function deviceTestNames(source: string): string[] {
  return [...source.matchAll(/^test(?:\.fails)?\('((?:[^'\\]|\\.)*)'/gm)].map(
    (match) => match[1]!.replace(/\\(.)/g, '$1'),
  )
}
