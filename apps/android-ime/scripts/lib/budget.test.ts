import {execFileSync} from 'node:child_process'
import {mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createVitest} from 'vitest/node'
import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'
import {
  ATTEMPT_SECONDS,
  ATTEMPT_WORST_SECONDS,
  CAPTURE_SEED_SECONDS,
  CHROME_ADB_SECONDS,
  CHROME_PID_SECONDS,
  CLEANUP_SECONDS,
  CLOSE_CHROME_SECONDS,
  COUNT_KILL_SECONDS,
  COUNT_SECONDS,
  countDeviceTests,
  DEVICE_SETTINGS_SECONDS,
  DEVICE_STATE_READ_SECONDS,
  DEVICE_STATE_SECONDS,
  DEVICE_TEST_FILE_SECONDS,
  DEVICE_TEST_TIMEOUT_SECONDS,
  DEVICE_TESTS_PER_FILE,
  DIAGNOSE_KILL_SECONDS,
  DIAGNOSE_SECONDS,
  DIAGNOSTICS_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
  DICTIONARY_CHECK_KILL_SECONDS,
  DICTIONARY_CHECK_SECONDS,
  DICTIONARY_LOAD_SECONDS,
  DICTIONARY_WAIT_KILL_SECONDS,
  DICTIONARY_WAIT_TAIL_SECONDS,
  FAULT_READ_SECONDS,
  HIDE_DIALOGS_SECONDS,
  JA_SETUP_KILL_SECONDS,
  JA_SETUP_SECONDS,
  JOIN_GRACE_SECONDS,
  KILL_GRACE_SECONDS,
  PREP_GROUP_KILL_SECONDS,
  PREP_KILL_SECONDS,
  PREP_LOG_SECONDS,
  PREP_SECONDS,
  PREP_SUMMARY_KILL_SECONDS,
  PREP_SUMMARY_SECONDS,
  prepFailureWorstSeconds,
  prepWorstSeconds,
  RESTART_SECONDS,
  runOnDeviceWorstSeconds,
  SELF_UPDATE_BLOCK_SECONDS,
  SERVE_SECONDS,
  SETTLE_ADB_KILL_SECONDS,
  SETTLE_CLEAR_SECONDS,
  SETTLE_LAST_START_SECONDS,
  SETTLE_PAUSE_SECONDS,
  SETTLE_READ_SECONDS,
  SETTLE_SECONDS,
  countSpaceTests,
  SPACE_CALL_WORST_SECONDS,
  SPACE_CHECK_SECONDS,
  SPACE_CLOCK_READ_SECONDS,
  SPACE_CLOCK_SECONDS,
  SPACE_DUMP_SECONDS,
  SPACE_LOGCAT_READ_SECONDS,
  SPACE_LOGCAT_SECONDS,
  SPACE_PAD_SECONDS,
  SPACE_TEST_TIMEOUT_SECONDS,
  SUITE_KILL_SECONDS,
  suiteSeconds,
  TYPE_ON_DEVICE_WORST_SECONDS,
} from './budget.ts'

const app = new URL('../../', import.meta.url)
const root = fileURLToPath(app)
const deviceFiles = readdirSync(new URL('tests/', app))
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`)
  .sort()
const script = readFileSync(new URL('scripts/run-on-device.sh', app), 'utf8')
const typing = readFileSync(new URL('scripts/lib/typing.ts', app), 'utf8')
const driver = readFileSync(new URL('scripts/driver.ts', app), 'utf8')
const logcat = readFileSync(new URL('scripts/lib/logcat.ts', app), 'utf8')
const workflow = readFileSync(new URL('../../.github/workflows/android-ime.yml', app), 'utf8')

// The emulator boot inside each run step, `emulator-boot-timeout`, and an allowance for the emulator
// runner's own SDK checks, AVD creation and shutdown around the script. Nothing times the runner's work on
// its own, only the run step's cap as a whole.
const BOOT_SECONDS = 360
const RUNNER_ALLOWANCE_SECONDS = 150

describe('DEVICE_TEST_FILE_SECONDS', () => {
  test('is the timeout `run-on-device.sh` runs a file of that many tests under, and `suiteSeconds` that of a smaller file', () => {
    const testStage = script.match(
      /^IME_SUMMARY_FILE=\S+ timeout -k 10 (\S+) pnpm exec vitest run --project device "\$file" /m,
    )
    const readBudget = script.match(/^tests_seconds=.*$/m)
    const read = (file: string) =>
      Number(
        execFileSync('bash', ['-c', `file=${file}; ${readBudget?.[0]}; echo $tests_seconds`], {
          cwd: root,
          encoding: 'utf8',
        }),
      )

    const directory = mkdtempSync(join(tmpdir(), 'android-ime-budget-'))
    const twoTests = join(directory, 'ja.two.test.ts')
    writeFileSync(twoTests, "test('a', () => {})\ntest.fails('b', () => {})\n")
    try {
      expect(testStage?.[1]).toEqual('"$tests_seconds"')
      expect({threeTests: read('tests/ja.test.ts'), twoTests: read(twoTests)}).toEqual({
        threeTests: DEVICE_TEST_FILE_SECONDS,
        twoTests: suiteSeconds(2),
      })
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })
})

describe('DEVICE_TESTS_PER_FILE', () => {
  test('no device test file declares more tests', async () => {
    const vitest = await createVitest('test', {
      root,
      config: false,
      watch: false,
      include: ['tests/*.test.ts'],
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect()
      const overBudget = testModules
        .map((testModule) => ({
          file: testModule.relativeModuleId,
          tests: [...testModule.children.allTests()].length,
        }))
        .filter(({tests}) => tests > DEVICE_TESTS_PER_FILE)

      expect(testModules.length).toBeGreaterThan(0)
      expect(overBudget).toEqual([])
    } finally {
      await vitest.close()
    }
  }, 30_000)
})

describe('the per-test bounds', () => {
  test('a call takes at most 687 seconds and a device test may run 727', () => {
    expect({call: TYPE_ON_DEVICE_WORST_SECONDS, test: DEVICE_TEST_TIMEOUT_SECONDS}).toEqual({call: 687, test: 727})
  })

  test('the restart before a retry is its two pid reads, its force-stop and its wait for the old pid, each with the kill graces', () => {
    expect(RESTART_SECONDS).toEqual(CHROME_PID_SECONDS + CHROME_ADB_SECONDS + CHROME_ADB_SECONDS + CHROME_PID_SECONDS + 3 * 2 * KILL_GRACE_SECONDS)
    expect(RESTART_SECONDS).toEqual(52)
  })

  test('the restart before the retry of a call without a `crash` is the force-stop alone, as before the pid reads, and fits in the one the call is bounded by', () => {
    expect({
      seconds: CLOSE_CHROME_SECONDS,
      deadline: /withDeadline\(\s*'restarting Chrome',\s*(\w+),\s*closeChrome,?\s*\)/.exec(driver)?.[1],
      fits: CLOSE_CHROME_SECONDS <= RESTART_SECONDS,
    }).toEqual({seconds: CHROME_ADB_SECONDS + 5, deadline: 'CLOSE_CHROME_SECONDS', fits: true})
    expect(CLOSE_CHROME_SECONDS).toEqual(20)
  })

  test('the `adb get-state` after a pid read adb could not make runs under its adb cap and both kill graces, and fits in the retry or the read of the page it replaces, so a call still takes at most 687 seconds', () => {
    expect({
      adbCap: /adb\(\['get-state'\], (\w+)\)/.exec(typing)?.[1],
      deadline: /withDeadline\('adb get-state', (\w+), deviceState\)/.exec(typing)?.[1],
      read: DEVICE_STATE_READ_SECONDS,
      fitsRetry: DEVICE_STATE_READ_SECONDS + JOIN_GRACE_SECONDS <= ATTEMPT_WORST_SECONDS,
      fitsPageRead: DEVICE_STATE_READ_SECONDS + JOIN_GRACE_SECONDS <= FAULT_READ_SECONDS + JOIN_GRACE_SECONDS,
      call: TYPE_ON_DEVICE_WORST_SECONDS,
    }).toEqual({
      adbCap: 'DEVICE_STATE_SECONDS',
      deadline: 'DEVICE_STATE_READ_SECONDS',
      read: DEVICE_STATE_SECONDS + 2 * KILL_GRACE_SECONDS,
      fitsRetry: true,
      fitsPageRead: true,
      call: 687,
    })
    expect(DEVICE_STATE_READ_SECONDS).toEqual(9)
  })
})

describe('the Space check after the final read of an English crash case', () => {
  test('runs each read under the cap `budget.ts` names', () => {
    expect({
      dump: /withDeadline\('dumping the strip after the last Space', (\w+),/.exec(typing)?.[1],
      clockSample: /adb\(\['shell', 'date \+%s\.%N'\], (\w+)\)/.exec(logcat)?.[1],
      clockRead: /withDeadline\('reading the device clock', (\w+),/.exec(logcat)?.[1],
      clockSamples: Number(/^const CLOCK_SAMPLES = (\d+)$/m.exec(logcat)?.[1]),
      logcat: /adbExit\(\['logcat', '-d', '-v', 'epoch', '-b', 'main', '-T', since\], (\w+)\)/.exec(logcat)?.[1],
      logcatRead: /withDeadline\('reading logcat', (\w+),/.exec(logcat)?.[1],
      logcatPause: /await sleep\(Math\.max\(0, windowsEnd \/ 1000 \+ (\d) \* SPACE_PAD_SECONDS - Date\.now\(\) \/ 1000\)\)/.exec(logcat)?.[1],
    }).toEqual({
      dump: 'SPACE_DUMP_SECONDS',
      clockSample: 'SPACE_CLOCK_SECONDS',
      clockRead: 'SPACE_CLOCK_READ_SECONDS',
      clockSamples: 3,
      logcat: 'SPACE_LOGCAT_SECONDS',
      logcatRead: 'SPACE_LOGCAT_READ_SECONDS',
      logcatPause: '2',
    })
  })

  test('runs after the attempt resolved and before its tap back, outside the attempt deadline', () => {
    expect(
      /withDeadline\(`attempt \$\{name\}`, ATTEMPT_SECONDS, \(\) =>[\s\S]*?\)\s*\.then\(\s*\/\/[^\n]*\n\s*\(typed\) => cleanup\.checkSpaces\?\.\(typed\) \?\? typed,\s*\(fault: unknown\) =>\s*readAfterFault\(fault, options, cleanup, pageErrors, input\),\s*\)\s*\.finally\(\(\) => returnToStart\(cleanup\)\)/.test(driver),
    ).toEqual(true)
  })

  test('adds at most 47 seconds, once a call, so a call with a Space to check takes at most 734 seconds and its test may run 774', () => {
    expect({
      dump: SPACE_DUMP_SECONDS,
      clock: SPACE_CLOCK_READ_SECONDS,
      logcat: SPACE_LOGCAT_READ_SECONDS,
      check: SPACE_CHECK_SECONDS,
      call: SPACE_CALL_WORST_SECONDS,
      test: SPACE_TEST_TIMEOUT_SECONDS,
    }).toEqual({
      dump: 5,
      clock: 3 * (SPACE_CLOCK_SECONDS + 2 * KILL_GRACE_SECONDS),
      logcat: 2 * SPACE_PAD_SECONDS + SPACE_LOGCAT_SECONDS + 2 * KILL_GRACE_SECONDS,
      check: SPACE_DUMP_SECONDS + JOIN_GRACE_SECONDS + SPACE_CLOCK_READ_SECONDS + JOIN_GRACE_SECONDS + SPACE_LOGCAT_READ_SECONDS + JOIN_GRACE_SECONDS,
      call: TYPE_ON_DEVICE_WORST_SECONDS + SPACE_CHECK_SECONDS,
      test: SPACE_CALL_WORST_SECONDS + CLEANUP_SECONDS + JOIN_GRACE_SECONDS,
    })
    expect({check: SPACE_CHECK_SECONDS, call: SPACE_CALL_WORST_SECONDS, test: SPACE_TEST_TIMEOUT_SECONDS}).toEqual({check: 47, call: 734, test: 774})
  })

  test('leaves every other call at 687 seconds and its test at 727', () => {
    expect({attempt: ATTEMPT_SECONDS, call: TYPE_ON_DEVICE_WORST_SECONDS, test: DEVICE_TEST_TIMEOUT_SECONDS}).toEqual({attempt: 180, call: 687, test: 727})
  })

  test('is the timeout of each device file whose tests can check a Space, and of no other', () => {
    // A Space is checked in an English call with a `crash` that taps Space to commit a word of letters.
    const checksSpace = (source: string) => /lang: 'en'/.test(source) && /crash:/.test(source) && /letters: '[^']*[^ ']'/.test(source)
    expect(
      Object.fromEntries(
        deviceFiles.map((file) => {
          const source = readFileSync(new URL(file, app), 'utf8')
          const tests = source.split(/^(?=test(?:\.fails)?\()/m).slice(1)
          return [file, {checkSpace: tests.filter(checksSpace).length, tests: tests.length, timeout: countSpaceTests(source)}]
        }),
      ),
    ).toEqual({
      'tests/en.test.ts': {checkSpace: 0, tests: 3, timeout: 0},
      'tests/ja.test.ts': {checkSpace: 0, tests: 3, timeout: 0},
    })
  })
})

describe(prepWorstSeconds.name, () => {
  test('the stages of the prep take at most 920 seconds, within its 925-second deadline', () => {
    expect({stages: prepWorstSeconds(), deadline: PREP_SECONDS}).toEqual({stages: 920, deadline: 925})
  })
})

describe(countDeviceTests.name, () => {
  test('counts top-level tests, failing ones included, and nothing nested or in comments', () => {
    expect(countDeviceTests("test('a', () => {})\n// test('b')\ntest.fails('c', () => {\n  test('d')\n})\n")).toEqual(2)
  })

  test('counts each device test file the way Vitest collects it', async () => {
    const vitest = await createVitest({
      root: fileURLToPath(app),
      config: false,
      watch: false,
      include: deviceFiles,
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect(deviceFiles, {staticParse: true})
      const collected = Object.fromEntries(
        testModules.map((testModule) => [testModule.relativeModuleId, [...testModule.children.allTests()].length]),
      )
      const counted = Object.fromEntries(
        deviceFiles.map((file) => [file, countDeviceTests(readFileSync(new URL(file, app), 'utf8'))]),
      )
      expect(counted).toEqual(collected)
    } finally {
      await vitest.close()
    }
  })
})

describe('run-on-device.sh', () => {
  test('runs each stage under the caps `budget.ts` sums', () => {
    expect({
      count: /timeout -k (\d+) (\d+) node scripts\/suite-seconds\.ts/.exec(script)?.slice(1).map(Number),
      prep: /timeout -k (\d+) (\d+) bash -c prep/.exec(script)?.slice(1).map(Number),
      suite: /timeout -k (\d+) "\$tests_seconds" pnpm exec vitest run --project device "\$file"/.exec(script)?.slice(1).map(Number),
      diagnostics: /timeout -k (\d+) (\d+) bash -c '\n\s+adb logcat -d -b crash/.exec(script)?.slice(1).map(Number),
      diagnose: /timeout -k (\d+) (\d+) scripts\/diagnose\.sh/.exec(script)?.slice(1).map(Number),
      japaneseSetup: /timeout -k (\d+) (\d+) node scripts\/setup-ja\.ts/.exec(script)?.slice(1).map(Number),
      dictionaryLoad: /^DICTIONARY_LOAD_SECONDS=(\d+)$/m.exec(script)?.slice(1).map(Number),
      dictionaryWait: /timeout -k (\d+) \$\(\(wait_seconds \+ (\d+)\)\) node scripts\/dictionary\.ts wait/.exec(script)?.slice(1).map(Number),
      dictionaryCheck: /timeout -k (\d+) (\d+) node scripts\/dictionary\.ts check/.exec(script)?.slice(1).map(Number),
      selfUpdateBlock: /timeout -k (\d+) (\d+) bash -c block_self_update/.exec(script)?.slice(1).map(Number),
      groupKill: /^stage\(\) \{ timeout -k (\d+) "\$1" bash -c "\$2";/m.exec(script)?.slice(1).map(Number),
      groups: [...script.matchAll(/^ {2}stage (\d+) (\w+) \|\| exit 1$/gm)].map((match) => [match[2], Number(match[1])]),
    }).toEqual({
      count: [COUNT_KILL_SECONDS, COUNT_SECONDS],
      prep: [PREP_KILL_SECONDS, PREP_SECONDS],
      suite: [SUITE_KILL_SECONDS],
      diagnostics: [DIAGNOSTICS_KILL_SECONDS, DIAGNOSTICS_SECONDS],
      diagnose: [DIAGNOSE_KILL_SECONDS, DIAGNOSE_SECONDS],
      japaneseSetup: [JA_SETUP_KILL_SECONDS, JA_SETUP_SECONDS],
      dictionaryLoad: [DICTIONARY_LOAD_SECONDS],
      dictionaryWait: [DICTIONARY_WAIT_KILL_SECONDS, DICTIONARY_WAIT_TAIL_SECONDS],
      dictionaryCheck: [DICTIONARY_CHECK_KILL_SECONDS, DICTIONARY_CHECK_SECONDS],
      selfUpdateBlock: [PREP_GROUP_KILL_SECONDS, SELF_UPDATE_BLOCK_SECONDS],
      groupKill: [PREP_GROUP_KILL_SECONDS],
      groups: [
        ['capture_seed', CAPTURE_SEED_SECONDS],
        ['hide_dialogs', HIDE_DIALOGS_SECONDS],
        ['device_settings', DEVICE_SETTINGS_SECONDS],
        ['serve_to_device', SERVE_SECONDS],
      ],
    })
  })

  test('runs the settle under the caps `SETTLE_SECONDS` sums, 285 seconds', () => {
    expect({
      lastStart: /^ {2}while \[ \$\(\(SECONDS - settle_start\)\) -lt (\d+) \]; do$/m.exec(script)?.slice(1).map(Number),
      read: /timeout -k (\d+) (\d+) adb logcat -d -b events/.exec(script)?.slice(1).map(Number),
      clear: /timeout -k (\d+) (\d+) adb logcat -b events -c/.exec(script)?.slice(1).map(Number),
      pause: /^ {4}sleep (\d+)\n {2}done\n {2}log "settle done/m.exec(script)?.slice(1).map(Number),
      settle: SETTLE_SECONDS,
    }).toEqual({
      lastStart: [SETTLE_LAST_START_SECONDS],
      read: [SETTLE_ADB_KILL_SECONDS, SETTLE_READ_SECONDS],
      clear: [SETTLE_ADB_KILL_SECONDS, SETTLE_CLEAR_SECONDS],
      pause: [SETTLE_PAUSE_SECONDS],
      settle: 285,
    })
  })

  test('bounds the `adb get-state` and the summary line after a failed prep, which skips the tests, within the script on the smallest file', () => {
    expect({
      prepLog: /^ {2}timeout (\d+) tail --pid="\$prep_log" -f \/dev\/null$/m.exec(script)?.slice(1).map(Number),
      getState: /timeout -k (\d+) (\d+) adb get-state/.exec(script)?.slice(1).map(Number),
      prepSummary: /timeout -k (\d+) (\d+) node scripts\/prep-summary\.ts "\$file"/.exec(script)?.slice(1).map(Number),
      prepFailure: prepFailureWorstSeconds(),
      fits: prepFailureWorstSeconds() <= runOnDeviceWorstSeconds(1),
    }).toEqual({
      prepLog: [PREP_LOG_SECONDS],
      getState: [KILL_GRACE_SECONDS, DEVICE_STATE_SECONDS],
      prepSummary: [PREP_SUMMARY_KILL_SECONDS, PREP_SUMMARY_SECONDS],
      prepFailure: 997,
      fits: true,
    })
  })

  test('keeps the boot capture reading for as long as the prep may run', () => {
    expect(/^ {2}capture_follow (\d+)$/m.exec(script)?.slice(1).map(Number)).toEqual([PREP_SECONDS])
  })

  test('runs no adb or network call in the prep outside a stage with a cap of its own', () => {
    const prep = /^prep\(\) \{\n([\s\S]*?)^\}$/m.exec(script)![1]!
    expect(prep.split('\n').filter((line) => /^\s*[^#\s].*\b(a|adb|curl) /.test(line) && !/\btimeout -k \d+ /.test(line))).toEqual([])
  })
})

describe('the workflow', () => {
  const rows = [...workflow.matchAll(/^\s+- \{lang: (\w+), file: (\S+)\}$/gm)].map((match) => ({lang: match[1]!, file: match[2]!}))
  const stepMinutes = [...workflow.matchAll(/^ {8}timeout-minutes: (\d+)$/gm)].map((match) => Number(match[1]))
  const runStepMinutes = [...workflow.matchAll(/^ {8}timeout-minutes: (\d+)\n(?: {8}.*\n)*? {8}uses: reactivecircus\/android-emulator-runner/gm)].map((match) =>
    Number(match[1]),
  )
  const jobMinutes = Number(/^ {4}timeout-minutes: (\d+)$/m.exec(workflow)?.[1])

  test('boots the emulator of each run step within the boot the run step allows', () => {
    expect([...workflow.matchAll(/^ {10}emulator-boot-timeout: (\d+)$/gm)].map((match) => Number(match[1]))).toEqual([BOOT_SECONDS, BOOT_SECONDS])
  })

  test('runs every device test file once, on a device prepared for the language its name starts with', () => {
    expect(rows.map((row) => row.file).sort()).toEqual(deviceFiles)
    expect(rows.filter((row) => !row.file.startsWith(`tests/${row.lang}.`))).toEqual([])
  })

  test('gives each run step the boot, the script on the longest file and the runner allowance, rounded up to a minute', () => {
    const longest = Math.max(
      ...deviceFiles.map((file) => {
        const source = readFileSync(new URL(file, app), 'utf8')
        return runOnDeviceWorstSeconds(countDeviceTests(source), countSpaceTests(source))
      }),
    )
    const needed = BOOT_SECONDS + longest + RUNNER_ALLOWANCE_SECONDS
    expect(runStepMinutes).toEqual([Math.ceil(needed / 60), Math.ceil(needed / 60)])
  })

  test('allows the job the sum of its step caps', () => {
    expect(jobMinutes).toEqual(stepMinutes.reduce((sum, minutes) => sum + minutes, 0))
  })
})

describe(suiteSeconds.name, () => {
  test('a file of three tests is capped at 2281 seconds and its script ends within 3316, a file of two at 1554 and 2589', () => {
    expect({
      threeTests: {suite: suiteSeconds(3), script: runOnDeviceWorstSeconds(3)},
      twoTests: {suite: suiteSeconds(2), script: runOnDeviceWorstSeconds(2)},
    }).toEqual({threeTests: {suite: 2281, script: 3316}, twoTests: {suite: 1554, script: 2589}})
  })

  test('a file of two tests that each check a Space is capped at 1648 seconds and its script ends within 2683', () => {
    expect({suite: suiteSeconds(2, 2), script: runOnDeviceWorstSeconds(2, 2)}).toEqual({suite: 1648, script: 2683})
  })
})

describe(countSpaceTests.name, () => {
  test('counts every top-level test of a file that sets `SPACE_TEST_TIMEOUT_SECONDS`, and none of one that does not or only mentions it', () => {
    expect({
      sets: countSpaceTests("vi.setConfig({testTimeout: SPACE_TEST_TIMEOUT_SECONDS * 1000})\ntest('a', () => {})\ntest.fails('b', () => {})\n"),
      mentions: countSpaceTests("// vi.setConfig({testTimeout: SPACE_TEST_TIMEOUT_SECONDS * 1000})\ntest('a', () => {})\n"),
    }).toEqual({sets: 2, mentions: 0})
  })
})
