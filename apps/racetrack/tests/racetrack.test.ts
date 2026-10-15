import {execFile} from 'node:child_process'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterAll, beforeAll, describe, expect, test} from 'vitest'
import type {EvidenceBundle} from '../src/bundle.ts'

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

let outDirectory = ''

beforeAll(async () => {
  outDirectory = await mkdtemp(path.join(tmpdir(), 'racetrack-test-'))
})

afterAll(async () => {
  await rm(outDirectory, {recursive: true, force: true})
})

describe('examples', () => {
  test('Scenario: typing in one editor passes and records `ready` at step 0', async () => {
    const {exitCode, bundle} = await racetrack(['examples/typing.feature'])

    expect(exitCode).toEqual(0)
    expect(bundleOutcome(bundle)).toEqual({
      passed: true,
      completed: true,
      assertionCount: 2,
      warnings: [],
      unhandledErrors: [],
    })
    expect(
      bundle.results[0]?.events
        .filter((event) => event.step === 0)
        .map((event) => [event.editor, event.type]),
    ).toEqual([['A', 'ready']])
  })

  test('Scenario: typing across two editors passes and records both `ready` events at step 0', async () => {
    const {exitCode, bundle} = await racetrack(['examples/two-editors.feature'])

    expect(exitCode).toEqual(0)
    expect(bundleOutcome(bundle)).toEqual({
      passed: true,
      completed: true,
      assertionCount: 1,
      warnings: [],
      unhandledErrors: [],
    })
    expect(
      bundle.results[0]?.events
        .filter((event) => event.step === 0)
        .map((event) => [event.editor, event.type]),
    ).toEqual([
      ['A', 'ready'],
      ['B', 'ready'],
    ])
  })
})

describe('regressions', () => {
  test('Scenario: a scenario cannot see the editors of the scenario before it', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/scenario-isolation.feature',
    ])

    expect(exitCode).toEqual(1)
    expect(bundle.results.map(resultOutcome)).toEqual([
      {
        scenario: 'The first scenario types',
        completed: true,
        passed: true,
        assertionCount: 1,
        warnings: [],
      },
      {
        scenario: 'The second scenario only asserts',
        completed: false,
        passed: false,
        assertionCount: 1,
        failedStep: 'the text is "foo"',
        error: "Cannot read properties of undefined (reading 'getSnapshot')",
        warnings: [],
      },
    ])
    expect(bundle.results[1]?.checkpoints).toEqual([
      {reason: 'failure', after: 'the text is "foo"', editors: {}},
    ])
  })

  test('Scenario: scenarios after a timed-out step do not run', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/step-timeout.feature',
      '--step-timeout',
      '1000',
    ])

    expect(exitCode).toEqual(1)
    expect(bundle.results.map(resultOutcome)).toEqual([
      {
        scenario: 'A step runs past the timeout',
        completed: false,
        passed: false,
        assertionCount: 0,
        failedStep: '"Backspace" is pressed 50 times',
        error: 'Step did not finish within 1000ms',
        warnings: ['no assertions'],
      },
      {
        scenario: 'The next scenario types',
        completed: false,
        passed: false,
        assertionCount: 0,
        error:
          'Not run: \'"Backspace" is pressed 50 times\' in "A step runs past the timeout" timed out and may still be running in the page',
        notRun:
          'Not run: \'"Backspace" is pressed 50 times\' in "A step runs past the timeout" timed out and may still be running in the page',
        warnings: [],
      },
    ])
  })

  test('Scenario: a scenario without assertions fails', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/no-assertions.feature',
    ])

    expect(exitCode).toEqual(1)
    expect(bundleOutcome(bundle)).toEqual({
      passed: false,
      completed: true,
      assertionCount: 0,
      warnings: ['no assertions'],
      unhandledErrors: [],
    })
  })

  test('Scenario: a failing assertion fails with a failure checkpoint', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/failing-assertion.feature',
    ])

    expect(exitCode).toEqual(1)
    expect(bundle.results.map(resultOutcome)).toEqual([
      {
        scenario: 'The text is not what the scenario expects',
        completed: false,
        passed: false,
        assertionCount: 1,
        failedStep: 'the text is "bar"',
        error:
          "Unexpected editor text: expected [ 'foo' ] to deeply equal [ 'bar' ]",
        warnings: [],
      },
    ])
    expect(
      bundle.results[0]?.checkpoints.map((checkpoint) => [
        checkpoint.reason,
        checkpoint.after,
        checkpoint.editors.A?.textspec,
      ]),
    ).toEqual([['failure', 'the text is "bar"', 'B: foo|']])
    expect(bundle.results[0]?.checkpoints[0]?.editors.A?.domSelection).toEqual({
      anchor: {path: textNodePath, offset: 3},
      focus: {path: textNodePath, offset: 3},
      text: '',
    })
  })

  test('Scenario: a failure capture that throws keeps the original failure', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/failure-capture.feature',
    ])

    expect(exitCode).toEqual(1)
    expect(bundle.results.length).toEqual(1)
    expect(bundle.results[0]?.failedStep).toEqual('two editors')
    expect(bundle.results[0]?.error).toEqual(
      expect.stringContaining('strict mode violation'),
    )
    expect(bundle.results[0]?.captureError).toEqual(
      expect.stringContaining('strict mode violation'),
    )
    expect(
      bundle.results[0]?.events
        .filter((event) => event.step === 0)
        .map((event) => [event.editor, event.type]),
    ).toEqual([
      ['A', 'ready'],
      ['B', 'ready'],
    ])
  })

  test('Scenario: only typing steps that type nothing get a warning', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/typing-warnings.feature',
    ])

    expect(exitCode).toEqual(0)
    expect(bundle.warnings).toEqual([
      '\'"foo" is typed\' (step 1) emitted no operation events: the typing step does nothing when the editor has no selection',
    ])
  })

  test('Scenario: focus tags are rejected', async () => {
    const {exitCode, bundle} = await racetrack([
      'tests/features/focus-tags.feature',
    ])

    expect(exitCode).toEqual(1)
    expect(bundle.results).toEqual([])
    expect(bundle.error).toEqual(
      'Racetrack does not support @skip or @only. Remove the tag from "A focused scenario" and put only the scenarios you want to run in the file.',
    )
  })

  test('Scenario: a missing feature file gives a failure bundle', async () => {
    const featurePath = path.join(outDirectory, 'missing.feature')
    const {exitCode, bundle, stderr} = await racetrack([featurePath])

    expect(exitCode).toEqual(1)
    expect(stderr).toEqual('')
    expect(bundle.results).toEqual([])
    expect(bundle.error).toEqual(
      `Could not read the feature file: ENOENT: no such file or directory, open '${featurePath}'`,
    )
  })

  test('Scenario: an unwritable output fails the run and still prints the bundle', async () => {
    const blockingFile = path.join(outDirectory, 'file')
    await writeFile(blockingFile, '')
    const {exitCode, bundle, stderr} = await racetrack(
      ['examples/typing.feature'],
      {out: path.join(blockingFile, 'bundle.json')},
    )

    expect(exitCode).toEqual(1)
    expect(stderr).toEqual('')
    expect(bundle.results.map((result) => result.passed)).toEqual([true])
    expect(bundle.passed).toEqual(false)
    expect(bundle.error).toEqual(
      expect.stringContaining('Could not write the evidence bundle:'),
    )
  })

  test('Scenario: concurrent runs write separate evidence files', async () => {
    const featurePath = path.join(outDirectory, 'missing.feature')
    const runs = await Promise.all(
      [0, 1, 2].map(() =>
        runCli(['run', featurePath]).then(({stdout}) => {
          const match = /^Evidence: (.*)$/m.exec(stdout)
          return match?.[1] ?? ''
        }),
      ),
    )

    try {
      expect(new Set(runs).size).toEqual(3)
      for (const evidencePath of runs) {
        expect(path.basename(evidencePath)).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z-[0-9a-f]{8}-missing\.json$/,
        )
        const bundle = JSON.parse(await readFile(evidencePath, 'utf8'))
        expect(bundle.passed).toEqual(false)
      }
    } finally {
      await Promise.all(
        runs.map((evidencePath) => rm(evidencePath, {force: true})),
      )
    }
  })
})

const textNodePath = [
  'div[0][data-pt-path="[_key==\\"k0\\"]"][data-pt-block="text"]',
  'div[0]',
  'span[0][data-pt-path="[_key==\\"k0\\"].children[_key==\\"k1\\"]"][data-pt-inline="span"]',
  'span[0][data-pt-marks]',
  'span[0][data-pt-text]',
  '#text[0]',
]

async function racetrack(
  args: Array<string>,
  options: {out?: string} = {},
): Promise<{exitCode: number; bundle: EvidenceBundle; stderr: string}> {
  const out =
    options.out ??
    path.join(outDirectory, `${Math.random().toString(16).slice(2)}.json`)
  const {exitCode, stdout, stderr} = await runCli([
    'run',
    ...args,
    '--json',
    '--out',
    out,
  ])

  return {exitCode, bundle: JSON.parse(stdout), stderr}
}

function runCli(
  args: Array<string>,
): Promise<{exitCode: number; stdout: string; stderr: string}> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [
        '--experimental-strip-types',
        '--disable-warning=ExperimentalWarning',
        'src/cli.ts',
        ...args,
      ],
      {cwd: appDirectory, env: {...process.env, INIT_CWD: appDirectory}},
      (error, stdout, stderr) => {
        resolve({
          exitCode: error
            ? typeof error.code === 'number'
              ? error.code
              : 1
            : 0,
          stdout,
          stderr,
        })
      },
    )
  })
}

function bundleOutcome(bundle: EvidenceBundle) {
  return {
    passed: bundle.passed,
    completed: bundle.completed,
    assertionCount: bundle.assertionCount,
    warnings: bundle.warnings,
    unhandledErrors: bundle.unhandledErrors,
  }
}

function resultOutcome(result: EvidenceBundle['results'][number]) {
  return {
    scenario: result.scenario,
    completed: result.completed,
    passed: result.passed,
    assertionCount: result.assertionCount,
    ...(result.failedStep !== undefined ? {failedStep: result.failedStep} : {}),
    ...(result.error !== undefined ? {error: result.error} : {}),
    ...(result.notRun !== undefined ? {notRun: result.notRun} : {}),
    warnings: result.warnings,
  }
}
