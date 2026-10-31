// Time bounds of one `typeOnDevice` call, in seconds. Every stage of the call is cut off at its bound, so
// the call ends within `TYPE_ON_DEVICE_WORST_SECONDS` however the device hangs, as long as its adb
// processes exit on SIGKILL. After one that does not, no typing starts and no run completes, see
// `assertNoUnstoppedProcess`.

/** One typing attempt, from launching Chrome to reading back the page. */
export const ATTEMPT_SECONDS: number = 180

/** Reading the page once after a failed attempt, before anything else touches the device. */
export const FAULT_READ_SECONDS: number = 30

/** Tapping Gboard back to the layout typing started on, once the attempt has its result or fault. */
export const RECOVERY_SECONDS: number = 20

/** The screen dump after a failed attempt. */
export const FAILURE_DUMP_SECONDS = 30

/** Stopping the uiautomator2 servers an attempt started. */
export const SERVER_CLOSE_SECONDS = 10

/** Each adb call that stops Chrome or clears its tabs. */
export const CHROME_ADB_SECONDS = 15

/** Stopping Chrome between the two attempts. */
export const RESTART_SECONDS = CHROME_ADB_SECONDS + 5

/** Stopping Chrome and clearing its tabs after the test. */
export const CLEANUP_SECONDS = 2 * CHROME_ADB_SECONDS + 5

/** How long an adb process gets to exit after SIGTERM, and again after SIGKILL. */
export const KILL_GRACE_SECONDS = 2

/**
 * How long a stage that ran out of time gets to stop its device calls before the next stage starts. It
 * covers an adb process's SIGTERM and SIGKILL graces.
 */
export const JOIN_GRACE_SECONDS = 2 * KILL_GRACE_SECONDS + 1

const ATTEMPT_WORST_SECONDS =
  ATTEMPT_SECONDS + JOIN_GRACE_SECONDS + FAULT_READ_SECONDS + JOIN_GRACE_SECONDS + RECOVERY_SECONDS + JOIN_GRACE_SECONDS + FAILURE_DUMP_SECONDS + JOIN_GRACE_SECONDS + SERVER_CLOSE_SECONDS + JOIN_GRACE_SECONDS

/** The longest a `typeOnDevice` call takes: two failed attempts with their dumps, the restart and the cleanup. */
export const TYPE_ON_DEVICE_WORST_SECONDS = 2 * ATTEMPT_WORST_SECONDS + RESTART_SECONDS + JOIN_GRACE_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS

/**
 * The device test timeout. A test that timed out leaves its cleanup running, and the next test waits for
 * it before typing, so each test has room for one carried-over cleanup on top of its own worst case.
 */
export const DEVICE_TEST_TIMEOUT_SECONDS = TYPE_ON_DEVICE_WORST_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS

// The stages of `run-on-device.sh`, each run under `timeout -k <kill-after> <seconds>`. Its unit test
// checks that the script uses these numbers.

/** Counting the tests in the file to run, `scripts/suite-seconds.ts`. */
export const COUNT_SECONDS = 20
export const COUNT_KILL_SECONDS = 5

/** The whole device prep, the ANR settle, Chrome and Gboard setup and the page server check. */
export const PREP_SECONDS = 600
export const PREP_KILL_SECONDS = 10

/** Vitest's own startup and global setup, on top of the tests. */
export const VITEST_STARTUP_SECONDS = 75
export const SUITE_KILL_SECONDS = 10

/** The crash dump, Chrome's exit info and the final screenshot after the tests. */
export const DIAGNOSTICS_SECONDS = 60
export const DIAGNOSTICS_KILL_SECONDS = 5

/**
 * The cap on a device test file of `testCount` tests. The driver runs one `typeOnDevice` call at a time,
 * and a test that timed out leaves its call to finish before the next starts, so the file ends within
 * one call's worst case per test.
 */
export function suiteSeconds(testCount: number): number {
  return testCount * TYPE_ON_DEVICE_WORST_SECONDS + VITEST_STARTUP_SECONDS
}

/** The longest `run-on-device.sh` runs for a file of `testCount` tests, every stage's kill-after included. */
export function runOnDeviceWorstSeconds(testCount: number): number {
  return (
    COUNT_SECONDS +
    COUNT_KILL_SECONDS +
    PREP_SECONDS +
    PREP_KILL_SECONDS +
    suiteSeconds(testCount) +
    SUITE_KILL_SECONDS +
    DIAGNOSTICS_SECONDS +
    DIAGNOSTICS_KILL_SECONDS
  )
}

/**
 * The number of tests in a device test file: its top-level `test(` and `test.fails(` calls. A unit test
 * checks the count against the tests Vitest collects from each file.
 */
export function countDeviceTests(source: string): number {
  return source.match(/^test(\.fails)?\(/gm)?.length ?? 0
}
