import {readdirSync, readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {deviceTestFileSeconds} from 'thumbjar/vitest'
import {describe, expect, test} from 'vitest'
import {createVitest} from 'vitest/node'
import {
  BOOT_SECONDS,
  CAP_READ_KILL_SECONDS,
  CAP_READ_SECONDS,
  countDeviceTests,
  DEVICE_CHECK_KILL_SECONDS,
  DEVICE_CHECK_SECONDS,
  DIAGNOSTICS_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
  PREP_SECONDS,
  runOnDeviceWorstSeconds,
  runStepMinutes,
  TESTS_KILL_SECONDS,
} from './budget.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const deviceFiles = readdirSync(new URL('../tests/', import.meta.url))
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`)
  .sort()
const script = readFileSync(
  new URL('../run-on-device.sh', import.meta.url),
  'utf8',
)
const prepare = readFileSync(
  new URL(
    'src/prepare/prepare.sh',
    pathToFileURL(
      createRequire(import.meta.url).resolve('thumbjar/package.json'),
    ),
  ),
  'utf8',
)
const workflow = readFileSync(
  new URL('../../../../.github/workflows/android-ime.yml', import.meta.url),
  'utf8',
)
const rows = [
  ...workflow.matchAll(/^ {10}- \{lang: (\w+), file: (\S+)\}$/gm),
].map((match) => ({lang: match[1], file: match[2]}))

describe(countDeviceTests.name, () => {
  test('counts top-level tests, failing ones included, and nothing nested or in comments', () => {
    expect(
      countDeviceTests(
        "test('a', () => {})\n// test('b')\ntest.fails('c', () => {\n  test('d')\n})\n",
      ),
    ).toEqual(2)
  })

  test('counts each device test file the way Vitest collects it', async () => {
    const vitest = await createVitest('test', {
      root,
      config: false,
      watch: false,
      include: deviceFiles,
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect()

      expect(
        Object.fromEntries(
          deviceFiles.map((file) => [
            file,
            countDeviceTests(readFileSync(`${root}${file}`, 'utf8')),
          ]),
        ),
      ).toEqual(
        Object.fromEntries(
          testModules.map((testModule) => [
            testModule.relativeModuleId,
            [...testModule.children.allTests()].length,
          ]),
        ),
      )
    } finally {
      await vitest.close()
    }
  }, 30_000)
})

describe(runOnDeviceWorstSeconds.name, () => {
  test('a file of three tests is capped at 1825 seconds and its script ends within 2540, a file of two at 1250 and 1965', () => {
    expect({
      threeTests: {
        tests: deviceTestFileSeconds(3),
        script: runOnDeviceWorstSeconds(3),
      },
      twoTests: {
        tests: deviceTestFileSeconds(2),
        script: runOnDeviceWorstSeconds(2),
      },
    }).toEqual({
      threeTests: {tests: 1825, script: 2540},
      twoTests: {tests: 1250, script: 1965},
    })
  })

  test('sums the caps `run-on-device.sh` and `thumbjar prepare` run their stages under', () => {
    expect({
      capRead:
        /^tests_seconds=\$\(timeout -k (\d+) (\d+) node android\/scripts\/budget\.ts "android\/\$file"\)$/m
          .exec(script)
          ?.slice(1)
          .map(Number),
      prep: /^timeout -k (\d+) (\d+) bash -c prep$/m
        .exec(prepare)
        ?.slice(1)
        .map(Number),
      tests:
        /^timeout -k (\d+) "\$tests_seconds" pnpm exec vitest run --config vitest\.android\.config\.ts --project device "\$file" /m
          .exec(script)
          ?.slice(1)
          .map(Number),
      deviceCheck:
        /timeout -k (\d+) (\d+) node android\/scripts\/emulator-runs\.ts device-state /
          .exec(script)
          ?.slice(1)
          .map(Number),
      diagnostics:
        /^timeout -k (\d+) (\d+) bash -c '\n\s+adb logcat -d -b crash/m
          .exec(script)
          ?.slice(1)
          .map(Number),
    }).toEqual({
      capRead: [CAP_READ_KILL_SECONDS, CAP_READ_SECONDS],
      prep: [10, PREP_SECONDS - 10],
      tests: [TESTS_KILL_SECONDS],
      deviceCheck: [DEVICE_CHECK_KILL_SECONDS, DEVICE_CHECK_SECONDS],
      diagnostics: [DIAGNOSTICS_KILL_SECONDS, DIAGNOSTICS_SECONDS],
    })
  })
})

describe('the workflow', () => {
  const stepMinutes = [
    ...workflow.matchAll(/^ {8}timeout-minutes: (\d+)$/gm),
  ].map((match) => Number(match[1]))
  const runStepCaps = [
    ...workflow.matchAll(
      /^ {8}timeout-minutes: (\d+)\n(?: {8}.*\n)*? {8}uses: reactivecircus\/android-emulator-runner/gm,
    ),
  ].map((match) => Number(match[1]))
  const jobMinutes = Number(/^ {4}timeout-minutes: (\d+)$/m.exec(workflow)?.[1])

  test('runs `ja.test.ts` and `en.test.ts` in a job each, on a device prepared for the language the file is named after', () => {
    expect(rows).toEqual([
      {lang: 'ja', file: 'tests/ja.test.ts'},
      {lang: 'en', file: 'tests/en.test.ts'},
    ])
  })

  test('leaves out only the hand-run `textarea` control', () => {
    expect(
      deviceFiles.filter((file) => !rows.some((row) => row.file === file)),
    ).toEqual(['tests/en-textarea.test.ts'])
  })

  test('names each job and its artifact after its file, and runs the file it names', () => {
    expect({
      job: /^ {4}name: (.*)$/m.exec(workflow)?.[1],
      suiteName: /^ {8}run: (echo "name=.*)$/m.exec(workflow)?.[1],
      artifact: /^ {10}name: (android-ime-.*)$/m.exec(workflow)?.[1],
      scripts: [...workflow.matchAll(/^ {10}script: (.*)$/gm)].map(
        (match) => match[1],
      ),
      languages: [...workflow.matchAll(/^ {10}IME_LANG: (.*)$/gm)].map(
        (match) => match[1],
      ),
    }).toEqual({
      job: 'Android IME (${{ matrix.suite.file }})',
      suiteName: `echo "name=$(basename '\${{ matrix.suite.file }}' .test.ts)" >> "$GITHUB_OUTPUT"`,
      artifact:
        'android-ime-${{ steps.suite.outputs.name }}-api${{ matrix.api }}-${{ github.run_attempt }}',
      scripts: [
        'android/run-on-device.sh ${{ matrix.suite.file }}',
        'android/run-on-device.sh ${{ matrix.suite.file }}',
      ],
      languages: ['${{ matrix.suite.lang }}', '${{ matrix.suite.lang }}'],
    })
  })

  test("boots each run step's emulator within `BOOT_SECONDS`", () => {
    expect(
      [...workflow.matchAll(/^ {10}emulator-boot-timeout: (\d+)$/gm)].map(
        (match) => Number(match[1]),
      ),
    ).toEqual([BOOT_SECONDS, BOOT_SECONDS])
  })

  test('gives each run step the boot, the script on the largest file CI runs and the runner allowance, rounded up to a minute', () => {
    const largest = Math.max(
      ...rows.map((row) =>
        countDeviceTests(readFileSync(`${root}${row.file}`, 'utf8')),
      ),
    )

    expect(runStepCaps).toEqual([
      runStepMinutes(largest),
      runStepMinutes(largest),
    ])
  })

  test('allows the job the sum of its step caps', () => {
    expect(jobMinutes).toEqual(
      stepMinutes.reduce((sum, minutes) => sum + minutes, 0),
    )
  })

  test('caps each run step at 52 minutes and the job at 152', () => {
    expect({runStepCaps, jobMinutes}).toEqual({
      runStepCaps: [52, 52],
      jobMinutes: 152,
    })
  })
})
