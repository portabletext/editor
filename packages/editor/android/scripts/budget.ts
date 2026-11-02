import {readFileSync} from 'node:fs'
import {deviceTestFileSeconds} from 'thumbjar/vitest'

// The caps `run-on-device.sh` runs its stages under, in seconds, each a `timeout -k <kill> <seconds>`.
// `budget.test.ts` checks the script against them and the workflow's `timeout-minutes` against their sum.

/**
 * The emulator runner's polling allowance for the boot, its `emulator-boot-timeout`. The runner checks it
 * only between its `adb` polls, which have no timeout of their own, so it bounds nothing. The run step's
 * `timeout-minutes` is what bounds the boot.
 */
export const BOOT_SECONDS = 360

/**
 * The emulator runner's own SDK checks, AVD creation and shutdown around the script. An allowance inside
 * the run step's cap, not a timer of its own: when the runner takes longer, the step's cap cancels the step.
 */
const RUNNER_ALLOWANCE_SECONDS = 180

/** Reading the test stage's cap for the file, `node android/scripts/budget.ts <file>`. */
export const CAP_READ_SECONDS = 10
export const CAP_READ_KILL_SECONDS = 5

/** `thumbjar prepare`, which runs its prep under `timeout -k 10 600`. */
export const PREP_SECONDS = 610

/** Stopping the test stage once it ran past `deviceTestFileSeconds`. */
export const TESTS_KILL_SECONDS = 10

/** The `adb get-state` read after a failed prep or test stage, `emulator-runs.ts device-state`. */
export const DEVICE_CHECK_SECONDS = 10
export const DEVICE_CHECK_KILL_SECONDS = 5

/** The crash dump, Chrome's exit info and the final screenshot after the tests. */
export const DIAGNOSTICS_SECONDS = 60
export const DIAGNOSTICS_KILL_SECONDS = 5

/**
 * The longest `run-on-device.sh` runs for a file of `testCount` tests, every stage's kill-after included. A
 * failed prep skips the tests, so the path through the tests is the longest.
 */
export function runOnDeviceWorstSeconds(testCount: number): number {
  return (
    CAP_READ_SECONDS +
    CAP_READ_KILL_SECONDS +
    PREP_SECONDS +
    deviceTestFileSeconds(testCount) +
    TESTS_KILL_SECONDS +
    DEVICE_CHECK_SECONDS +
    DEVICE_CHECK_KILL_SECONDS +
    DIAGNOSTICS_SECONDS +
    DIAGNOSTICS_KILL_SECONDS
  )
}

/** A run step's `timeout-minutes` for a file of `testCount` tests: the boot, the script and the runner. */
export function runStepMinutes(testCount: number): number {
  return Math.ceil(
    (BOOT_SECONDS +
      runOnDeviceWorstSeconds(testCount) +
      RUNNER_ALLOWANCE_SECONDS) /
      60,
  )
}

/**
 * The number of tests in a device test file: its top-level `test(` and `test.fails(` calls. A unit test
 * checks the count against the tests Vitest collects from each file.
 */
export function countDeviceTests(source: string): number {
  return source.match(/^test(\.fails)?\(/gm)?.length ?? 0
}

if (import.meta.main) {
  const file = process.argv[2]
  if (file === undefined) {
    throw new Error('usage: node android/scripts/budget.ts <test file>')
  }
  const testCount = countDeviceTests(readFileSync(file, 'utf8'))
  if (testCount === 0) {
    throw new Error(`no tests in ${file}`)
  }
  process.stdout.write(`${deviceTestFileSeconds(testCount)}\n`)
}
