import {afterAll} from 'vitest'
import {unstoppedProcesses} from '../device/adb.ts'
import {driverRuns} from '../driver.ts'

afterAll(() => {
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
  const incomplete = driverRuns
    .filter(
      (run) =>
        run.fails && (run.state === 'driving' || run.state === 'aborted'),
    )
    .map((run) => `"${run.test}"`)
  const problems = [
    ...(faulted.length > 0
      ? [`The driver ended on a driver fault in ${faulted.join(', ')}.`]
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
