// Time bounds of one `typeOnDevice` call, in seconds. Every stage of the call is cut off at its bound, so
// the call ends within `TYPE_ON_DEVICE_WORST_SECONDS` however the device hangs, as long as its adb
// processes exit on SIGKILL. After one that does not, no typing starts and no run completes, see
// `assertNoUnstoppedProcess`.

/** One typing attempt, from launching Chrome to reading back the page. */
export const ATTEMPT_SECONDS = 180

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
  ATTEMPT_SECONDS +
  JOIN_GRACE_SECONDS +
  FAILURE_DUMP_SECONDS +
  JOIN_GRACE_SECONDS +
  SERVER_CLOSE_SECONDS +
  JOIN_GRACE_SECONDS

/** The longest a `typeOnDevice` call takes: two failed attempts with their dumps, the restart and the cleanup. */
export const TYPE_ON_DEVICE_WORST_SECONDS =
  2 * ATTEMPT_WORST_SECONDS +
  RESTART_SECONDS +
  JOIN_GRACE_SECONDS +
  CLEANUP_SECONDS +
  JOIN_GRACE_SECONDS

/**
 * The device test timeout. A test that timed out leaves its cleanup running, and the next test waits for
 * it before typing, so each test has room for one carried-over cleanup on top of its own worst case.
 */
export const DEVICE_TEST_TIMEOUT_SECONDS =
  TYPE_ON_DEVICE_WORST_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS
