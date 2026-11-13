import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {countDeviceTests, deviceTestFileSeconds} from 'thumbjar/vitest'
import {describe, expect, test} from 'vitest'
import {createVitest} from 'vitest/node'

const root = fileURLToPath(new URL('..', import.meta.url))
const deviceFiles = readdirSync(new URL('../tests/', import.meta.url))
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`)
  .sort()
describe(countDeviceTests.name, () => {
  test('counts each device test file the way Vitest collects it', async () => {
    const vitest = await createVitest('test', {
      root,
      config: false,
      watch: false,
      include: deviceFiles,
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect(undefined, {
        staticParse: false,
      })
      expect(
        testModules.flatMap((module) =>
          module.errors().map((error) => error.message),
        ),
      ).toEqual([])

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

describe('the workflow', () => {
  const workflow = readFileSync(
    new URL('../../../../.github/workflows/android-ime.yml', import.meta.url),
    'utf8',
  )
  // oxfmt wraps a long row over several lines, so each row is read as the flow mapping between its braces.
  const rows = [...workflow.matchAll(/^ {10}- \{([^}]*)\}$/gm)].map((match) => {
    const row = Object.fromEntries(
      match[1]!
        .split(',')
        .map((pair) => pair.split(':').map((part) => part.trim()))
        .filter((pair) => pair[0] !== ''),
    )
    return {
      lang: row.lang as 'ja' | 'en',
      file: row.file as string,
      runMinutes: Number(row.runMinutes),
    }
  })

  test('runs each editor device suite in a job prepared for its language', () => {
    expect(rows).toEqual([
      {lang: 'ja', file: 'tests/ja.test.ts', runMinutes: 90},
      {lang: 'en', file: 'tests/en.test.ts', runMinutes: 90},
      {lang: 'ja', file: 'tests/ja.enter.test.ts', runMinutes: 90},
      {lang: 'en', file: 'tests/en.enter.test.ts', runMinutes: 90},
      {lang: 'en', file: 'tests/en.insert.break.test.ts', runMinutes: 101},
      {lang: 'en', file: 'tests/en.insert.text.test.ts', runMinutes: 90},
    ])
  })

  test('leaves out only the hand-run `textarea` control', () => {
    expect(
      deviceFiles.filter((file) => !rows.some((row) => row.file === file)),
    ).toEqual(['tests/en-textarea.test.ts'])
  })

  test('gives every row enough run minutes for its declared test count', () => {
    for (const row of rows) {
      const count = countDeviceTests(readFileSync(`${root}${row.file}`, 'utf8'))
      expect(row.runMinutes, row.file).toBeGreaterThanOrEqual(
        Math.ceil(deviceTestFileSeconds(count) / 60),
      )
    }
  })

  test('gives both run steps the cap of the matrix row they run', () => {
    const steps = workflow
      .split(/^ {4}steps:$/m)[1]!
      .split(/^ {6}- /m)
      .slice(1)
    const runSteps = steps.filter((step) => /^ {8}id: run[12]$/m.test(step))

    expect(runSteps).toHaveLength(2)
    for (const step of runSteps) {
      expect(step).toMatch(
        /^ {8}timeout-minutes: \$\{\{ matrix.suite.runMinutes \}\}$/m,
      )
    }
  })

  test('gives the job a cap equal to every step cap added up, so a hang in every step still leaves the steps that report', () => {
    const jobCap = Number(/^ {4}timeout-minutes: (\d+)$/m.exec(workflow)?.[1])
    const steps = workflow
      .split(/^ {4}steps:$/m)[1]!
      .split(/^ {6}- /m)
      .slice(1)
    const stepCaps = steps.map((step) =>
      /^ {8}timeout-minutes: \$\{\{ matrix.suite.runMinutes \}\}$/m.test(step)
        ? Math.max(...rows.map((row) => row.runMinutes))
        : Number(/^ {8}timeout-minutes: (\d+)$/m.exec(step)?.[1]),
    )

    // A step without a cap would run up to the job's cap, and the sum below would not hold it.
    expect(stepCaps.filter((cap) => !Number.isInteger(cap))).toEqual([])
    expect(jobCap).toBeLessThanOrEqual(360)
    expect(jobCap).toEqual(stepCaps.reduce((sum, cap) => sum + cap, 0))
  })

  test('names each job and its artifact after its file, and runs the file it names', () => {
    expect({
      job: /^ {4}name: (.*)$/m.exec(workflow)?.[1],
      suiteName: /^ {8}run: (echo "name=.*)$/m.exec(workflow)?.[1],
      artifact: /^ {10}name: (android-ime-.*)$/m.exec(workflow)?.[1],
      scripts: [...workflow.matchAll(/^ {10}script: (.*)$/gm)].map(
        (match) => match[1],
      ),
      // The keyboard goes to `thumbjar run` as a flag, nothing reads an environment variable for it.
      keyboardEnvironment: workflow.includes('IME_LANG'),
    }).toEqual({
      job: 'Android IME (${{ matrix.suite.file }})',
      suiteName: `echo "name=$(basename '\${{ matrix.suite.file }}' .test.ts)" >> "$GITHUB_OUTPUT"`,
      artifact:
        'android-ime-${{ steps.suite.outputs.name }}-api${{ matrix.api }}-${{ github.run_attempt }}',
      scripts: [
        'pnpm exec thumbjar run ${{ matrix.suite.file }} --keyboard ${{ matrix.suite.lang }} --page-dir android/dist --config vitest.android.config.ts --project device --out-dir android/out',
        'pnpm exec thumbjar run ${{ matrix.suite.file }} --keyboard ${{ matrix.suite.lang }} --page-dir android/dist --config vitest.android.config.ts --project device --out-dir android/out',
      ],
      keyboardEnvironment: false,
    })
  })
})
