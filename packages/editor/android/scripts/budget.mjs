import {readFileSync, realpathSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {
  deviceTestFileSeconds,
  FETCH_U2_JAR_WORST_SECONDS,
  prepWorstSeconds,
} from 'thumbjar/vitest'

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

/** Reading the test stage's cap for the file, `node android/scripts/budget.mjs <file>`. */
export const CAP_READ_SECONDS = 10
export const CAP_READ_KILL_SECONDS = 5

/**
 * `thumbjar prepare` for `keyboard`, its kill-after included: the Play Store block, and for Japanese the dictionary wait.
 *
 * @param {'ja' | 'en'} keyboard
 * @returns {number}
 */
export function prepSeconds(keyboard) {
  return prepWorstSeconds(keyboard)
}

/** Stopping the test stage once it ran past `deviceTestFileSeconds`. */
export const TESTS_KILL_SECONDS = 10

/** The `adb get-state` read after a failed prep or test stage, `emulator-runs.mjs device-state`. */
export const DEVICE_CHECK_SECONDS = 10
export const DEVICE_CHECK_KILL_SECONDS = 5

/** The crash dump, Chrome's exit info and the final screenshot after the tests. */
export const DIAGNOSTICS_SECONDS = 60
export const DIAGNOSTICS_KILL_SECONDS = 5

/**
 * The longest `run-on-device.sh` runs for a file of `testCount` tests on a device prepared for `keyboard`,
 * every stage's kill-after included. A failed prep skips the tests, so the path through the tests is the
 * longest.
 *
 * @param {'ja' | 'en'} keyboard
 * @param {number} testCount
 * @returns {number}
 */
export function runOnDeviceWorstSeconds(keyboard, testCount) {
  return (
    CAP_READ_SECONDS +
    CAP_READ_KILL_SECONDS +
    prepSeconds(keyboard) +
    deviceTestFileSeconds(testCount) +
    TESTS_KILL_SECONDS +
    DEVICE_CHECK_SECONDS +
    DEVICE_CHECK_KILL_SECONDS +
    DIAGNOSTICS_SECONDS +
    DIAGNOSTICS_KILL_SECONDS
  )
}

/**
 * Time in each run step that no cap counts: the action starting the script, the shell and `pnpm` starting
 * each stage, and the logging between stages. Without it the step's cap could stop the script before it
 * logs the reason a stage of its own gave.
 */
export const RUN_STEP_HEADROOM_SECONDS = 60

/**
 * A run step's `timeout-minutes` for a file of `testCount` tests on a device prepared for `keyboard`: the
 * boot, the script, the runner and the headroom.
 *
 * @param {'ja' | 'en'} keyboard
 * @param {number} testCount
 * @returns {number}
 */
export function runStepMinutes(keyboard, testCount) {
  return Math.ceil(
    (BOOT_SECONDS +
      runOnDeviceWorstSeconds(keyboard, testCount) +
      RUNNER_ALLOWANCE_SECONDS +
      RUN_STEP_HEADROOM_SECONDS) /
      60,
  )
}

/** The job's time beyond its steps' caps, for the runner to move between steps, so the Result step runs. */
export const JOB_HEADROOM_MINUTES = 1

/** `pnpm` and Node starting `thumbjar fetch-u2-jar`, which its own bound does not count. */
export const FETCH_STEP_HEADROOM_SECONDS = 15

/** The jar fetch step's `timeout-minutes`: thumbjar's three downloads and their waits, and the headroom. */
export function fetchStepMinutes() {
  return Math.ceil(
    (FETCH_U2_JAR_WORST_SECONDS + FETCH_STEP_HEADROOM_SECONDS) / 60,
  )
}

/**
 * The number of tests in a device test file: its top-level `test(` and `test.fails(` calls. A unit test
 * checks the count against the tests Vitest collects from each file.
 *
 * @param {string} source
 * @returns {number}
 */
export function countDeviceTests(source) {
  return source.match(/^test(\.fails)?\(/gm)?.length ?? 0
}

if (isMain()) {
  const file = process.argv[2]
  if (file === undefined) {
    throw new Error('usage: node android/scripts/budget.mjs <test file>')
  }
  const testCount = countDeviceTests(readFileSync(file, 'utf8'))
  if (testCount === 0) {
    throw new Error(`no tests in ${file}`)
  }
  process.stdout.write(`${deviceTestFileSeconds(testCount)}\n`)
}

/**
 * Whether `node` runs this file. Where Node sets `import.meta.main` to a boolean, from 22.18 and 24.2, that
 * is the answer. On a Node without it the entry path `process.argv[1]` decides: no entry path is not
 * this file, and an entry path equal to this file's path is, without reading the filesystem, so a file
 * removed after Node loaded it still runs. Otherwise the entry path is resolved, since a script run through
 * a symlinked directory has its real path as `import.meta.url`, and an entry path that does not resolve,
 * such as `-` for a module read from stdin, is not this file.
 *
 * @returns {boolean}
 */
function isMain() {
  /** @type {{main?: unknown}} */
  const meta = import.meta
  if (typeof meta.main === 'boolean') {
    return meta.main
  }
  const entry = process.argv[1]
  if (entry === undefined) {
    return false
  }
  const file = fileURLToPath(import.meta.url)
  if (entry === file) {
    return true
  }
  try {
    return realpathSync(entry) === file
  } catch {
    return false
  }
}
