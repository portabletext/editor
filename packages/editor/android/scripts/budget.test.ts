import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {countDeviceTests} from 'thumbjar/vitest'
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
    return {lang: row.lang as 'ja' | 'en', file: row.file as string}
  })

  test('runs each matrix file on a device prepared for its language', () => {
    expect(rows).toEqual([
      {lang: 'en', file: 'tests/matrix.en.test.ts'},
      {lang: 'en', file: 'tests/matrix.en.2.test.ts'},
      {lang: 'ja', file: 'tests/matrix.ja.test.ts'},
      {lang: 'ja', file: 'tests/matrix.ja.2.test.ts'},
    ])
  })

  test('leaves the original suites available for hand runs', () => {
    expect(
      deviceFiles.filter((file) => !rows.some((row) => row.file === file)),
    ).toEqual([
      'tests/en-textarea.test.ts',
      'tests/en.enter.test.ts',
      'tests/en.test.ts',
      'tests/ja.enter.test.ts',
      'tests/ja.test.ts',
    ])
  })

  test('gives the job a cap no lower than every step cap added up, so a hang in every step still leaves the steps that report', () => {
    const jobCap = Number(/^ {4}timeout-minutes: (\d+)$/m.exec(workflow)?.[1])
    const steps = workflow
      .split(/^ {4}steps:$/m)[1]!
      .split(/^ {6}- /m)
      .slice(1)
    const stepCaps = steps.map((step) =>
      Number(/^ {8}timeout-minutes: (\d+)$/m.exec(step)?.[1]),
    )

    // A step without a cap would run up to the job's cap, and the sum below would not hold it.
    expect(stepCaps.filter((cap) => !Number.isInteger(cap))).toEqual([])
    expect(jobCap).toBeGreaterThanOrEqual(
      stepCaps.reduce((sum, cap) => sum + cap, 0),
    )
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
