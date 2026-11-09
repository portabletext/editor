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

/** Each adb call that stops Chrome. */
export const CHROME_ADB_SECONDS = 15

/** Stopping Chrome between the two attempts. */
export const RESTART_SECONDS = CHROME_ADB_SECONDS + 5

/** Stopping Chrome after the test. */
export const CLEANUP_SECONDS = CHROME_ADB_SECONDS + 5

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

/**
 * The global setup's `adb get-state`, which checks for a device. Stopping it after the timeout takes up to
 * `JOIN_GRACE_SECONDS` more, after which the setup fails even when the process outlived SIGKILL.
 */
export const GLOBAL_SETUP_ADB_SECONDS = 30

/** The global setup's request for the test page. */
export const GLOBAL_SETUP_PAGE_SECONDS = 5

/** Vitest's start, the collection of the file, the synchronous `afterAll` in `src/vitest/setup.ts` and its exit. */
export const VITEST_STARTUP_SECONDS = 60

/**
 * The longest a run of one device test file of `testCount` tests takes, the timeout to run it under.
 * Cutting the run off earlier would stop Vitest before its last test times out and before `afterAll` in
 * `src/vitest/setup.ts` can name a driver fault.
 */
export function deviceTestFileSeconds(testCount: number): number {
  return (
    testCount * DEVICE_TEST_TIMEOUT_SECONDS +
    GLOBAL_SETUP_ADB_SECONDS +
    JOIN_GRACE_SECONDS +
    GLOBAL_SETUP_PAGE_SECONDS +
    VITEST_STARTUP_SECONDS
  )
}

/**
 * `thumbjar prepare`'s stages before this change, the ANR settle, the device facts, Chrome and the soft
 * keyboard, the Japanese layout and the page check. They have no cap of their own, so the prep's deadline
 * bounds them together.
 */
export const PREP_STAGES_SECONDS = 600

/** The Japanese prep's boot capture: its header, the `main` buffer's size, the seed dump and logd's counts. */
export const CAPTURE_SEED_SECONDS = 15

/** Disabling Play Store, so it updates no app during the run. A failure there is only logged. */
export const SELF_UPDATE_BLOCK_SECONDS = 20

/**
 * How long after the emulator came online Gboard gets to log its Japanese dictionary load. Over 18 fresh
 * boots the load came 80 to 176 seconds after boot. One boot logged a dictionary download error and a retry
 * about 65 seconds before its load, and 360 also covers a load that needs one more such retry.
 */
export const DICTIONARY_LOAD_SECONDS = 360

/**
 * The dictionary wait's last read of the capture and the Gboard version query for its failure message,
 * after `DICTIONARY_LOAD_SECONDS`.
 */
export const DICTIONARY_WAIT_TAIL_SECONDS = 45
export const DICTIONARY_WAIT_KILL_SECONDS = 5

/** The switch to Japanese and the uncommitted `kyou` after the dictionary loaded, `dictionary.js check`. */
export const DICTIONARY_CHECK_SECONDS = 180
export const DICTIONARY_CHECK_KILL_SECONDS = 10

/** How long the prep gets to stop once it ran past its deadline. */
export const PREP_KILL_SECONDS = 10

/**
 * The longest `thumbjar prepare` runs for `keyboard`, its kill-after included, so the time a caller's prep
 * stage needs. English runs its stages and the Play Store block. Japanese adds the boot capture before its
 * deadline and the dictionary wait and check, and the wait ends `DICTIONARY_LOAD_SECONDS` after the
 * emulator came online, which the stages before it already cover, or with one last read when they ran past
 * it.
 */
export function prepWorstSeconds(keyboard: 'ja' | 'en'): number {
  const english =
    SELF_UPDATE_BLOCK_SECONDS +
    KILL_GRACE_SECONDS +
    PREP_STAGES_SECONDS +
    PREP_KILL_SECONDS
  if (keyboard === 'en') {
    return english
  }
  return (
    english -
    PREP_STAGES_SECONDS +
    Math.max(PREP_STAGES_SECONDS, DICTIONARY_LOAD_SECONDS) +
    CAPTURE_SEED_SECONDS +
    KILL_GRACE_SECONDS +
    DICTIONARY_WAIT_TAIL_SECONDS +
    DICTIONARY_WAIT_KILL_SECONDS +
    DICTIONARY_CHECK_SECONDS +
    DICTIONARY_CHECK_KILL_SECONDS
  )
}

/** One download of the uiautomator2 server jar, its body included. The slowest seen on CI took 16. */
export const U2_JAR_ATTEMPT_SECONDS = 45

/** The downloads `thumbjar fetch-u2-jar` tries. */
export const U2_JAR_ATTEMPTS = 3

/** The wait before the next download. The host's 504s come several in a row, so a retry waits past them. */
export const U2_JAR_RETRY_SECONDS = 15

/** The longest `thumbjar fetch-u2-jar` runs: every download times out, with the waits between them. */
export const FETCH_U2_JAR_WORST_SECONDS =
  U2_JAR_ATTEMPTS * U2_JAR_ATTEMPT_SECONDS +
  (U2_JAR_ATTEMPTS - 1) * U2_JAR_RETRY_SECONDS
