import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {countDeviceTests, runStepWorstSeconds} from 'thumbjar/vitest'
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
    .split('\n  emulator:\n')[1]!
    .split('\n  result:\n')[0]!
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
      actionMinutes: Number(row.actionMinutes),
    }
  })

  test('runs each editor device suite in a job prepared for its language', () => {
    expect(rows).toEqual([
      {
        lang: 'ja',
        file: 'tests/ja.test.ts',
        runMinutes: 90,
        actionMinutes: 190,
      },
      {
        lang: 'en',
        file: 'tests/en.test.ts',
        runMinutes: 90,
        actionMinutes: 190,
      },
      {
        lang: 'ja',
        file: 'tests/ja.enter.test.ts',
        runMinutes: 90,
        actionMinutes: 190,
      },
      {
        lang: 'en',
        file: 'tests/en.enter.test.ts',
        runMinutes: 90,
        actionMinutes: 190,
      },
      {
        lang: 'en',
        file: 'tests/en.insert.break.test.ts',
        runMinutes: 124,
        actionMinutes: 258,
      },
      {
        lang: 'en',
        file: 'tests/en.insert.text.test.ts',
        runMinutes: 90,
        actionMinutes: 190,
      },
    ])
  })

  test('leaves out only the hand-run `textarea` control', () => {
    expect(
      deviceFiles.filter((file) => !rows.some((row) => row.file === file)),
    ).toEqual(['tests/en-textarea.test.ts'])
  })

  test('gives every row enough run minutes for the whole run step at its declared test count', () => {
    for (const row of rows) {
      const count = countDeviceTests(readFileSync(`${root}${row.file}`, 'utf8'))
      expect(row.runMinutes, row.file).toBeGreaterThanOrEqual(
        Math.ceil(runStepWorstSeconds(row.lang, count) / 60),
      )
    }
  })

  // thumbjar's `docs/ci.md`: the step that uses the action covers two runs, 4 minutes for the jar, 5 for
  // the upload and 1 for the rest.
  test('gives the action step two runs of its row plus the jar, the upload and the rest', () => {
    const steps = workflow
      .split(/^ {4}steps:$/m)[1]!
      .split(/^ {6}- /m)
      .slice(1)
    const actionSteps = steps.filter((step) =>
      /^ {8}uses: portabletext\/thumbjar\/android@/m.test(step),
    )

    expect(actionSteps).toHaveLength(1)
    expect(actionSteps[0]).toMatch(
      /^ {8}timeout-minutes: \$\{\{ matrix.suite.actionMinutes \}\}$/m,
    )
    for (const row of rows) {
      expect(row.actionMinutes, row.file).toEqual(
        2 * row.runMinutes + 4 + 5 + 1,
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
      /^ {8}timeout-minutes: \$\{\{ matrix.suite.actionMinutes \}\}$/m.test(
        step,
      )
        ? Math.max(...rows.map((row) => row.actionMinutes))
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
      inputs: [...workflow.matchAll(/^ {10}([a-z-]+): (.*)$/gm)].map(
        (match) => [match[1], match[2]],
      ),
    }).toEqual({
      job: 'Android IME (${{ matrix.suite.file }})',
      suiteName: `echo "name=$(basename '\${{ matrix.suite.file }}' .test.ts)" >> "$GITHUB_OUTPUT"`,
      inputs: [
        ['node-version', '24'],
        ['test', '${{ matrix.suite.file }}'],
        ['keyboard', '${{ matrix.suite.lang }}'],
        ['working-directory', 'packages/editor/android'],
        ['page-dir', 'dist'],
        ['config', '../vitest.android.config.ts'],
        ['project', 'device'],
        ['out-dir', 'out'],
        [
          'artifact-name',
          'android-ime-${{ steps.suite.outputs.name }}-api${{ matrix.api }}-${{ github.run_attempt }}',
        ],
        ['api-level', '${{ matrix.api }}'],
      ],
    })
  })
})
