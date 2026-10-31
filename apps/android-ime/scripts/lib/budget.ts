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

/** How long an adb process gets to exit after SIGTERM, and again after SIGKILL. */
export const KILL_GRACE_SECONDS = 2

/** Each adb call that stops Chrome or clears its tabs. */
export const CHROME_ADB_SECONDS = 15

/** Each `pidof` that reads Chrome's process ids, before and after the restart between the attempts. */
export const CHROME_PID_SECONDS = 5

/** Stopping Chrome between the two attempts of a call without a `crash`, which reads no pid. */
export const CLOSE_CHROME_SECONDS = CHROME_ADB_SECONDS + 5

/**
 * Stopping Chrome between the two attempts of a call with a `crash`: reading its pid, the force-stop, and
 * reading the pid again until the old process is gone, which starts no read later than `CHROME_ADB_SECONDS`
 * after the force-stop, each of the three stages with an adb process's SIGTERM and SIGKILL graces. The call's
 * worst case counts this one, the longer restart.
 */
export const RESTART_SECONDS = CHROME_PID_SECONDS + CHROME_ADB_SECONDS + CHROME_ADB_SECONDS + CHROME_PID_SECONDS + 3 * 2 * KILL_GRACE_SECONDS

/**
 * The one `adb get-state` after a pid read of that restart, or of the retry's check for a fresh Chrome,
 * failed in a way that can mean adb lost the device. It decides whether a timeout counts as device offline,
 * and names the device's state in the call's result. After a failed prep, `run-on-device.sh` reads it once
 * too, under this cap and `KILL_GRACE_SECONDS`.
 */
export const DEVICE_STATE_SECONDS = 5

/**
 * The driver's read of `adb get-state`, which runs once the restart or the retry that failed has stopped:
 * the adb process's cap and both its graces. With `JOIN_GRACE_SECONDS` it runs in place of the retry the
 * restart stopped, or in place of the read of the page after the fault, which the retry skips when its
 * check for a fresh Chrome fails, since that check comes before the page loads.
 */
export const DEVICE_STATE_READ_SECONDS = DEVICE_STATE_SECONDS + 2 * KILL_GRACE_SECONDS

/** Stopping Chrome and clearing its tabs after the test. */
export const CLEANUP_SECONDS = 2 * CHROME_ADB_SECONDS + 5

/**
 * How long a stage that ran out of time gets to stop its device calls before the next stage starts. It
 * covers an adb process's SIGTERM and SIGKILL graces.
 */
export const JOIN_GRACE_SECONDS = 2 * KILL_GRACE_SECONDS + 1

/**
 * The dump of Gboard's suggestion strip after the last Space that commits a word in a call with an English
 * `crash`, see `scripts/lib/space.ts`, which no tap follows. It runs once the attempt read the page for the
 * last time, as do the clock and logcat reads below. Every other strip the check reads comes from a dump the
 * driver takes anyway before a tap. In the Space probe a dump took at most 0.6 seconds.
 */
export const SPACE_DUMP_SECONDS = 5

/** Each of the three `adb shell date` reads of the device's clock after that dump. */
export const SPACE_CLOCK_SECONDS = 2

/** The driver's bound on the three, each the adb process's cap and both its kill graces. */
export const SPACE_CLOCK_READ_SECONDS = 3 * (SPACE_CLOCK_SECONDS + 2 * KILL_GRACE_SECONDS)

/**
 * How far each Space's window in `main` is widened on both sides, see `scripts/lib/logcat.ts`, for the
 * error of the clock offset at the time it was sampled, at most half the round trip of its sample, which
 * may take no longer than the pad. In the Space probe an `adb shell` round trip took 36 to 219
 * milliseconds. It bounds neither the age of a dump's snapshot nor a clock that moved before the sample,
 * which is why `inputRestarted` only explains an inconclusive.
 */
export const SPACE_PAD_SECONDS = 1

/**
 * How much earlier than the pad before the call's first tap `main` is read from. It is extra history for
 * the diagnostics only, with no guarantee that the windows of a misaligned clock offset fall on it.
 */
export const SPACE_LEAD_SECONDS = 5

/** The one `adb logcat -d` of the `main` buffer after the clock reads. */
export const SPACE_LOGCAT_SECONDS = 3

/**
 * The driver's bound on that read: a pause until twice the pad after the last window's end, so a buffer
 * that logs at all holds a line newer than the padded window, the adb process's cap and both its kill
 * graces.
 */
export const SPACE_LOGCAT_READ_SECONDS = 2 * SPACE_PAD_SECONDS + SPACE_LOGCAT_SECONDS + 2 * KILL_GRACE_SECONDS

/**
 * The longest the Space check adds to an attempt that returned its result: the dump, the clock reads and
 * the logcat read, each with `JOIN_GRACE_SECONDS` to stop. It runs after the attempt's deadline settled, once
 * per attempt however many Spaces the call taps.
 */
export const SPACE_CHECK_SECONDS =
  SPACE_DUMP_SECONDS + JOIN_GRACE_SECONDS + SPACE_CLOCK_READ_SECONDS + JOIN_GRACE_SECONDS + SPACE_LOGCAT_READ_SECONDS + JOIN_GRACE_SECONDS

/** One failed attempt with its read after the fault, its tap back, its dump and its server stop. */
export const ATTEMPT_WORST_SECONDS =
  ATTEMPT_SECONDS + JOIN_GRACE_SECONDS + FAULT_READ_SECONDS + JOIN_GRACE_SECONDS + RECOVERY_SECONDS + JOIN_GRACE_SECONDS + FAILURE_DUMP_SECONDS + JOIN_GRACE_SECONDS + SERVER_CLOSE_SECONDS + JOIN_GRACE_SECONDS

/** The longest a `typeOnDevice` call takes: two failed attempts with their dumps, the restart and the cleanup. */
export const TYPE_ON_DEVICE_WORST_SECONDS = 2 * ATTEMPT_WORST_SECONDS + RESTART_SECONDS + JOIN_GRACE_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS

/**
 * The longest a call with an English `crash` takes. The Space check runs only after an attempt returned
 * its result, and the call ends on that attempt whatever the check finds, so it runs at most once a call.
 * An attempt that ends on it skips the read after a fault, so the call's worst case grows by the check
 * alone.
 */
export const SPACE_CALL_WORST_SECONDS = TYPE_ON_DEVICE_WORST_SECONDS + SPACE_CHECK_SECONDS

/**
 * The device test timeout. A test that timed out leaves its cleanup running, and the next test waits for
 * it before typing, so each test has room for one carried-over cleanup on top of its own worst case.
 */
export const DEVICE_TEST_TIMEOUT_SECONDS = TYPE_ON_DEVICE_WORST_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS

/**
 * The timeout of a device test whose call checks its Spaces, with the same room for a carried-over
 * cleanup. A file of such tests sets it for all of its tests with `vi.setConfig`.
 */
export const SPACE_TEST_TIMEOUT_SECONDS = SPACE_CALL_WORST_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS

/** The device tests in one file. `scripts/lib/budget.test.ts` fails when a file declares more. */
export const DEVICE_TESTS_PER_FILE = 3

/**
 * The global setup's `adb get-state`, which checks for a device. Stopping it after the timeout takes up to
 * `JOIN_GRACE_SECONDS` more, after which the setup fails even when the process outlived SIGKILL.
 */
export const GLOBAL_SETUP_ADB_SECONDS = 30

/** The global setup's request for the test page. */
export const GLOBAL_SETUP_PAGE_SECONDS = 5

/**
 * Vitest's start, the collection of the file, the synchronous `afterAll` in `tests/setup.ts` and its exit.
 * An allowance inside the test stage's cap, `suiteSeconds`, which `run-on-device.sh` enforces as a whole,
 * not a timer of its own: when these take longer, they eat into the time the file's last test has left.
 */
export const VITEST_STARTUP_SECONDS = 60

/** The longest a run of a device test file takes, one of `DEVICE_TESTS_PER_FILE` tests. */
export const DEVICE_TEST_FILE_SECONDS = suiteSeconds(DEVICE_TESTS_PER_FILE)

// The stages of `run-on-device.sh`, each run under `timeout -k <kill-after> <seconds>`. Its unit test
// checks that the script uses these numbers.

/** Counting the tests in the file to run and reading its cap from this file, `scripts/suite-seconds.ts`. */
export const COUNT_SECONDS = 20
export const COUNT_KILL_SECONDS = 5

/** The whole device prep, the ANR settle, Chrome and Gboard setup, the Japanese dictionary and the page server check. */
export const PREP_SECONDS = 925
export const PREP_KILL_SECONDS = 10

/** How long a group of the prep's adb calls that ran out of time gets to stop, the `stage` function's kill-after. */
export const PREP_GROUP_KILL_SECONDS = 2

/** The boot capture's header, buffer size, seed dump and logd statistics, before its reader starts in the background. */
export const CAPTURE_SEED_SECONDS = 15

/** Hiding error dialogs before the ANR settle. */
export const HIDE_DIALOGS_SECONDS = 10

/** Disabling Play Store, so it updates no app during the job. A failure there is only logged. */
export const SELF_UPDATE_BLOCK_SECONDS = 20

/**
 * The ANR settle in the prep: it starts no check after `SETTLE_LAST_START_SECONDS`, and the last check reads
 * the events log, may clear it, each adb call with `SETTLE_ADB_KILL_SECONDS` to stop, and pauses.
 */
export const SETTLE_LAST_START_SECONDS = 240
export const SETTLE_READ_SECONDS = 20
export const SETTLE_CLEAR_SECONDS = 10
export const SETTLE_ADB_KILL_SECONDS = 5
export const SETTLE_PAUSE_SECONDS = 5
export const SETTLE_SECONDS =
  SETTLE_LAST_START_SECONDS + SETTLE_READ_SECONDS + SETTLE_ADB_KILL_SECONDS + SETTLE_CLEAR_SECONDS + SETTLE_ADB_KILL_SECONDS + SETTLE_PAUSE_SECONDS

/** The device facts in the prep, `scripts/diagnose.sh`. */
export const DIAGNOSE_SECONDS = 60
export const DIAGNOSE_KILL_SECONDS = 5

/** Chrome's command line and the soft keyboard setting. */
export const DEVICE_SETTINGS_SECONDS = 10

/** Adding the Japanese layout, `scripts/setup-ja.ts`. */
export const JA_SETUP_SECONDS = 240
export const JA_SETUP_KILL_SECONDS = 10

/**
 * How long after boot Gboard gets to log its Japanese dictionary load. Over 18 fresh boots the load came 80
 * to 176 seconds after boot. One boot logged a dictionary download error and a retry about 65 seconds
 * before its load, and 360 also covers a load that needs one more such retry.
 */
export const DICTIONARY_LOAD_SECONDS = 360

/** The dictionary wait's last read of the capture and the Gboard version query for its failure message. */
export const DICTIONARY_WAIT_TAIL_SECONDS = 45
export const DICTIONARY_WAIT_KILL_SECONDS = 5

/** The switch to Japanese and the uncommitted `kyou` after the dictionary loaded, `scripts/dictionary.ts check`. */
export const DICTIONARY_CHECK_SECONDS = 180
export const DICTIONARY_CHECK_KILL_SECONDS = 10

/** Clearing logcat, the page server check and `adb reverse`. */
export const SERVE_SECONDS = 15

/**
 * After a failed prep, which skips the test stage: `tee` writing the prep's last lines to its log, and the
 * file's summary line, `scripts/prep-summary.ts`.
 */
export const PREP_LOG_SECONDS = 5
export const PREP_SUMMARY_SECONDS = 20
export const PREP_SUMMARY_KILL_SECONDS = 5

/** Stopping the test stage once it ran past `suiteSeconds`. */
export const SUITE_KILL_SECONDS = 10

/** The crash dump, Chrome's exit info and the final screenshot after the tests. */
export const DIAGNOSTICS_SECONDS = 60
export const DIAGNOSTICS_KILL_SECONDS = 5

/**
 * The cap on a device test file of `testCount` tests, `spaceTestCount` of them with an English `crash`:
 * each test's timeout, the global setup and Vitest's start and exit. Cutting the run off earlier would stop
 * Vitest before its last test times out and before `afterAll` in `tests/setup.ts` can name a driver fault.
 */
export function suiteSeconds(testCount: number, spaceTestCount = 0): number {
  return (
    (testCount - spaceTestCount) * DEVICE_TEST_TIMEOUT_SECONDS +
    spaceTestCount * SPACE_TEST_TIMEOUT_SECONDS +
    GLOBAL_SETUP_ADB_SECONDS +
    JOIN_GRACE_SECONDS +
    GLOBAL_SETUP_PAGE_SECONDS +
    VITEST_STARTUP_SECONDS
  )
}

/**
 * The longest the prep's stages take, each a cap the script enforces, so the prep ends within it unless an
 * adb process outlives SIGKILL. The dictionary wait ends `DICTIONARY_LOAD_SECONDS` after boot, or at once
 * with one last read when the stages before it ran past that. Between the stages the prep runs only local
 * shell commands.
 */
export function prepWorstSeconds(): number {
  const beforeDictionary =
    CAPTURE_SEED_SECONDS +
    PREP_GROUP_KILL_SECONDS +
    HIDE_DIALOGS_SECONDS +
    PREP_GROUP_KILL_SECONDS +
    SELF_UPDATE_BLOCK_SECONDS +
    PREP_GROUP_KILL_SECONDS +
    SETTLE_SECONDS +
    DIAGNOSE_SECONDS +
    DIAGNOSE_KILL_SECONDS +
    DEVICE_SETTINGS_SECONDS +
    PREP_GROUP_KILL_SECONDS +
    JA_SETUP_SECONDS +
    JA_SETUP_KILL_SECONDS
  return (
    Math.max(DICTIONARY_LOAD_SECONDS, beforeDictionary) +
    DICTIONARY_WAIT_TAIL_SECONDS +
    DICTIONARY_WAIT_KILL_SECONDS +
    DICTIONARY_CHECK_SECONDS +
    DICTIONARY_CHECK_KILL_SECONDS +
    SERVE_SECONDS +
    PREP_GROUP_KILL_SECONDS
  )
}

/**
 * The longest `run-on-device.sh` runs for a file of `testCount` tests, `spaceTestCount` of them with an
 * English `crash`, every stage's kill-after included. Each run step's `timeout-minutes` adds the boot and
 * `RUNNER_ALLOWANCE_SECONDS`, 150, in `scripts/lib/budget.test.ts`, for the emulator runner's SDK checks,
 * AVD creation and shutdown. That is an allowance inside the step's cap, not a timer of its own: when the
 * runner takes longer, the step's cap cancels the step, whatever the script has left to run.
 */
export function runOnDeviceWorstSeconds(testCount: number, spaceTestCount = 0): number {
  return (
    COUNT_SECONDS +
    COUNT_KILL_SECONDS +
    PREP_SECONDS +
    PREP_KILL_SECONDS +
    suiteSeconds(testCount, spaceTestCount) +
    SUITE_KILL_SECONDS +
    DIAGNOSTICS_SECONDS +
    DIAGNOSTICS_KILL_SECONDS
  )
}

/**
 * The longest `run-on-device.sh` runs when its prep fails: it counts the tests, preps, reads `adb get-state`
 * once and writes the summary line.
 */
export function prepFailureWorstSeconds(): number {
  return (
    COUNT_SECONDS +
    COUNT_KILL_SECONDS +
    PREP_SECONDS +
    PREP_KILL_SECONDS +
    PREP_LOG_SECONDS +
    DEVICE_STATE_SECONDS +
    KILL_GRACE_SECONDS +
    PREP_SUMMARY_SECONDS +
    PREP_SUMMARY_KILL_SECONDS
  )
}

/**
 * The number of tests in a device test file: its top-level `test(` and `test.fails(` calls. A unit test
 * checks the count against the tests Vitest collects from each file.
 */
export function countDeviceTests(source: string): number {
  return source.match(/^test(\.fails)?\(/gm)?.length ?? 0
}

/** The number of tests in a device test file that sets `SPACE_TEST_TIMEOUT_SECONDS` as its test timeout: all of them, or none. */
export function countSpaceTests(source: string): number {
  return /^vi\.setConfig\(\{testTimeout: SPACE_TEST_TIMEOUT_SECONDS \* 1000\}\)$/m.test(source) ? countDeviceTests(source) : 0
}
