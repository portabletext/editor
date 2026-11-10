import {appendFileSync} from 'node:fs'
import {afterAll, type RunnerTask, type RunnerTestCase} from 'vitest'
import {unstoppedProcesses} from '../device/adb.ts'
import {driverRuns, lastDriverRun} from '../driver.ts'
import {summaryLines, testOutcome} from './summary.ts'

// oxlint-disable-next-line no-empty-pattern -- Vitest reads a hook's first argument as the fixtures it uses and takes only an object pattern, and this hook uses none
afterAll(({}, file) => {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY
  if (summaryFile) {
    appendFileSync(
      summaryFile,
      summaryLines(
        file.name,
        leafTests(file.tasks).map((test) => ({
          name: test.name,
          // A skipped or todo test, or one skipped as it ran, ends neither passed nor failed.
          outcome:
            test.result?.state === 'pass' || test.result?.state === 'fail'
              ? testOutcome({
                  passed: test.result.state === 'pass',
                  fails: Boolean(test.fails),
                  run: lastDriverRun(test),
                })
              : undefined,
        })),
        driverRuns,
      ),
    )
  }
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
  const unresolved = driverRuns
    .filter(
      (run) =>
        run.fails &&
        (run.state === 'inconclusive' || run.state === 'device-offline'),
    )
    .map((run) =>
      run.state === 'inconclusive'
        ? `In "${run.test}" the driver ended inconclusive: ${run.reason}.`
        : `In "${run.test}" ${run.reason}.`,
    )
  const faulted = driverRuns
    .filter((run) => run.fails && run.state === 'faulted')
    .map((run) => `"${run.test}"`)
  const incomplete = driverRuns
    .filter(
      (run) =>
        run.fails && (run.state === 'driving' || run.state === 'aborted'),
    )
    .map((run) => `"${run.test}"`)
  const withoutDriverCall = leafTests(file.tasks)
    .filter(
      (test) =>
        test.fails &&
        (test.result?.state === 'pass' || test.result?.state === 'fail') &&
        lastDriverRun(test) === undefined,
    )
    .map((test) => `"${test.name}"`)
  const problems = [
    ...unresolved,
    ...(faulted.length > 0
      ? [`The driver ended on a driver fault in ${faulted.join(', ')}.`]
      : []),
    ...(incomplete.length > 0
      ? [
          `The driver never returned a result and cleaned up in ${incomplete.join(', ')}, the test timed out or its cleanup failed.`,
        ]
      : []),
    ...(withoutDriverCall.length > 0
      ? [`No driver call was recorded for ${withoutDriverCall.join(', ')}.`]
      : []),
  ]
  if (problems.length > 0) {
    throw new Error(
      `${problems.join(' ')} These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
    )
  }
})

function leafTests(tasks: readonly RunnerTask[]): RunnerTestCase[] {
  return tasks.flatMap((task) =>
    task.type === 'test'
      ? [task]
      : task.type === 'suite'
        ? leafTests(task.tasks)
        : [],
  )
}
