import {appendFileSync} from 'node:fs'
import {afterAll} from 'vitest'
import {driverRuns, type DriverRun} from '../scripts/driver.ts'
import {unstoppedProcesses} from '../scripts/lib/adb.ts'

afterAll(({}, file) => {
  // `scripts/run-on-device.sh` names the file and adds it to the job summary.
  const summaryFile = process.env.IME_SUMMARY_FILE
  if (summaryFile)
    appendFileSync(
      summaryFile,
      `${summaryLine(
        file.name,
        file.tasks.map((task) => ({
          name: task.name,
          passed: task.result?.state === 'pass',
          run: driverRuns.findLast((run) => run.test === task.name),
        })),
      )}\n`,
    )
  const unstopped = unstoppedProcesses()
  if (unstopped.length > 0) {
    throw new Error(
      `${unstopped.join(', ')} outlived SIGKILL and may still have touched the device during later tests, so no result in this file can be trusted.`,
    )
  }
  const pageExceptions = driverRuns.filter(
    (run) => run.state === 'page-exception',
  )
  if (pageExceptions.length > 0) {
    throw new Error(
      `The page threw while the driver typed, which can be an editor failure, so it is not retried: ${pageExceptions.map((run) => `"${run.test}": ${run.pageException}`).join(', ')}.`,
    )
  }
  const faulted = driverRuns
    .filter((run) => run.fails && run.state === 'faulted')
    .map((run) => `"${run.test}"`)
  const faultedWithPageErrors = driverRuns
    .filter((run) => run.fails && run.state === 'faulted-with-page-errors')
    .map((run) => `"${run.test}": ${run.faultWithPageErrors}`)
  const inconclusive = driverRuns
    .filter((run) => run.fails && run.state === 'inconclusive')
    .map((run) => `In "${run.test}": ${run.inconclusive}.`)
  const incomplete = driverRuns
    .filter(
      (run) =>
        run.fails && (run.state === 'driving' || run.state === 'aborted'),
    )
    .map((run) => `"${run.test}"`)
  const problems = [
    ...inconclusive,
    ...(faulted.length > 0
      ? [`The driver ended on a driver fault in ${faulted.join(', ')}.`]
      : []),
    ...(faultedWithPageErrors.length > 0
      ? [
          `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in ${faultedWithPageErrors.join(', ')}.`,
        ]
      : []),
    ...(incomplete.length > 0
      ? [
          `The driver never returned a result and cleaned up in ${incomplete.join(', ')}, the test timed out or its cleanup failed.`,
        ]
      : []),
  ]
  if (problems.length > 0) {
    throw new Error(
      `${problems.join(' ')} These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
    )
  }
})

const OUTCOMES = [
  'passed',
  'failed',
  'expected crash reproduced',
  'expected failure',
  'inconclusive',
  'driver fault',
] as const

/**
 * One line for the job summary: how many tests of `file` ended in each outcome, and which. An inconclusive
 * call and a driver fault are counted apart from a failure, since neither says anything about the editor.
 */
function summaryLine(
  file: string,
  tests: Array<{name: string; passed: boolean; run: DriverRun | undefined}>,
): string {
  const outcome = ({
    passed,
    run,
  }: (typeof tests)[number]): (typeof OUTCOMES)[number] => {
    if (run?.state === 'inconclusive') return 'inconclusive'
    // A call that timed out or never cleaned up reproduced nothing, and failed no assertion either.
    if (
      run?.state === 'faulted' ||
      run?.state === 'faulted-with-page-errors' ||
      run?.state === 'aborted' ||
      run?.state === 'driving'
    )
      return 'driver fault'
    if (!passed || run?.state === 'page-exception') return 'failed'
    if (!run?.fails) return 'passed'
    // A completed call with a `crash` returns errors only when each matches it, and a `test.fails` test
    // without errors failed on something else.
    return run.crash && (run.errors ?? []).length > 0
      ? 'expected crash reproduced'
      : 'expected failure'
  }
  const counts = OUTCOMES.map((name) => {
    const names = tests
      .filter((test) => outcome(test) === name)
      .map((test) => `"${test.name}"`)
    return names.length > 0
      ? `${names.length} ${name} (${names.join(', ')})`
      : `0 ${name}`
  })
  return `\`${file}\`: ${counts.join(', ')}`
}
