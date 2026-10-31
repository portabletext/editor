import {readdirSync, readFileSync} from 'node:fs'
import {createVitest} from 'vitest/node'
import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'
import {
  CAPTURE_SEED_SECONDS,
  COUNT_KILL_SECONDS,
  COUNT_SECONDS,
  countDeviceTests,
  DEVICE_SETTINGS_SECONDS,
  DEVICE_TEST_TIMEOUT_SECONDS,
  DIAGNOSE_KILL_SECONDS,
  DIAGNOSE_SECONDS,
  DIAGNOSTICS_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
  DICTIONARY_CHECK_KILL_SECONDS,
  DICTIONARY_CHECK_SECONDS,
  DICTIONARY_LOAD_SECONDS,
  DICTIONARY_WAIT_KILL_SECONDS,
  DICTIONARY_WAIT_TAIL_SECONDS,
  HIDE_DIALOGS_SECONDS,
  JA_SETUP_KILL_SECONDS,
  JA_SETUP_SECONDS,
  PREP_GROUP_KILL_SECONDS,
  PREP_KILL_SECONDS,
  PREP_SECONDS,
  prepWorstSeconds,
  runOnDeviceWorstSeconds,
  SERVE_SECONDS,
  SUITE_KILL_SECONDS,
  suiteSeconds,
  TYPE_ON_DEVICE_WORST_SECONDS,
} from './budget.ts'

const app = new URL('../../', import.meta.url)
const deviceFiles = readdirSync(new URL('tests/', app))
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`)
  .sort()
const script = readFileSync(new URL('scripts/run-on-device.sh', app), 'utf8')
const workflow = readFileSync(new URL('../../.github/workflows/android-ime.yml', app), 'utf8')

// The emulator boot inside each run step, `emulator-boot-timeout`, and an allowance for the emulator
// runner's own SDK checks, AVD creation and shutdown around the script, which nothing times.
const BOOT_SECONDS = 360
const RUNNER_ALLOWANCE_SECONDS = 150

describe('the per-test bounds', () => {
  test('a call takes at most 655 seconds and a device test may run 695', () => {
    expect({call: TYPE_ON_DEVICE_WORST_SECONDS, test: DEVICE_TEST_TIMEOUT_SECONDS}).toEqual({call: 655, test: 695})
  })
})

describe(prepWorstSeconds.name, () => {
  test('the stages of the prep take at most 898 seconds, within its 900-second deadline', () => {
    expect({stages: prepWorstSeconds(), deadline: PREP_SECONDS}).toEqual({stages: 898, deadline: 900})
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
      suite: /timeout -k (\d+) "\$suite_seconds" pnpm exec vitest run --project device "\$file"/.exec(script)?.slice(1).map(Number),
      diagnostics: /timeout -k (\d+) (\d+) bash -c '\n\s+adb logcat -d -b crash/.exec(script)?.slice(1).map(Number),
      diagnose: /timeout -k (\d+) (\d+) scripts\/diagnose\.sh/.exec(script)?.slice(1).map(Number),
      japaneseSetup: /timeout -k (\d+) (\d+) node scripts\/setup-ja\.ts/.exec(script)?.slice(1).map(Number),
      dictionaryLoad: /^DICTIONARY_LOAD_SECONDS=(\d+)$/m.exec(script)?.slice(1).map(Number),
      dictionaryWait: /timeout -k (\d+) \$\(\(wait_seconds \+ (\d+)\)\) node scripts\/dictionary\.ts wait/.exec(script)?.slice(1).map(Number),
      dictionaryCheck: /timeout -k (\d+) (\d+) node scripts\/dictionary\.ts check/.exec(script)?.slice(1).map(Number),
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
      groupKill: [PREP_GROUP_KILL_SECONDS],
      groups: [
        ['capture_seed', CAPTURE_SEED_SECONDS],
        ['hide_dialogs', HIDE_DIALOGS_SECONDS],
        ['device_settings', DEVICE_SETTINGS_SECONDS],
        ['serve_to_device', SERVE_SECONDS],
      ],
    })
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

  // The split timing spike runs only its own files.
  test('runs every split timing file once, on a device prepared for the language its name starts with', () => {
    expect(rows.map((row) => row.file).sort()).toEqual(deviceFiles.filter((file) => file.includes('.split-timing')))
    expect(rows.filter((row) => !row.file.startsWith(`tests/${row.lang}.`))).toEqual([])
  })

  test('holds no more than three tests in any device test file', () => {
    const counts = deviceFiles.map((file) => ({file, tests: countDeviceTests(readFileSync(new URL(file, app), 'utf8'))}))
    expect(counts.filter((count) => count.tests > 3)).toEqual([])
  })

  test('gives each run step room for the boot and the script on the largest file', () => {
    const largest = Math.max(...deviceFiles.map((file) => countDeviceTests(readFileSync(new URL(file, app), 'utf8'))))
    const needed = BOOT_SECONDS + runOnDeviceWorstSeconds(largest) + RUNNER_ALLOWANCE_SECONDS
    expect({
      runSteps: runStepMinutes.length,
      tooShort: runStepMinutes.filter((minutes) => minutes * 60 < needed),
    }).toEqual({runSteps: 2, tooShort: []})
  })

  test('allows the job the sum of its step caps', () => {
    expect(jobMinutes).toEqual(stepMinutes.reduce((sum, minutes) => sum + minutes, 0))
  })
})

describe(suiteSeconds.name, () => {
  test('a file of three tests is capped at 2040 seconds and its script ends within 3050', () => {
    expect({suite: suiteSeconds(3), script: runOnDeviceWorstSeconds(3)}).toEqual({suite: 2040, script: 3050})
  })
})
