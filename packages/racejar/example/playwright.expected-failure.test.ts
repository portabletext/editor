import {execFile} from 'node:child_process'
import {createRequire} from 'node:module'
import path from 'node:path'
import {promisify} from 'node:util'
import {expect, test} from 'vitest'

const run = promisify(execFile)
const require = createRequire(import.meta.url)
const root = new URL('..', import.meta.url).pathname
const cli = path.join(
  path.dirname(require.resolve('@playwright/test/package.json')),
  'cli.js',
)

type Report = {
  errors: Array<{message: string}>
  suites: Array<{
    suites?: Array<{
      specs: Array<{title: string; tests: Array<{status: string}>}>
    }>
  }>
}

async function runPlaywright(mode: string) {
  const {stdout} = await run(
    process.execPath,
    [
      cli,
      'test',
      'example-playwright/expected-failure.test.ts',
      '--reporter=json',
    ],
    {
      cwd: root,
      // The `only` mode needs `forbidOnly` off, which CI turns on.
      env: {...process.env, CI: '', RACEJAR_PROBE: mode},
      maxBuffer: 10_000_000,
    },
  ).catch((error: {stdout: string}) => ({stdout: error.stdout}))
  const report: Report = JSON.parse(stdout)
  return {
    errors: report.errors.map((error) => error.message),
    results: report.suites.flatMap((suite) =>
      (suite.suites ?? []).flatMap((inner) =>
        inner.specs.map((spec) => ({
          name: spec.title,
          status: spec.tests[0]!.status,
        })),
      ),
    ),
  }
}

test('Playwright expected failures include After assertions and reject repairs and stale entries', async () => {
  const modes = ['broken', 'fixed', 'ordinary-broken', 'skip', 'only', 'stale']
  const outcomes: Record<string, unknown> = {}
  for (const mode of modes) {
    const {errors, results} = await runPlaywright(mode)
    outcomes[mode] =
      mode === 'stale'
        ? errors.some((message) =>
            message.includes(
              'Expected failure predicate matched no scenario rows',
            ),
          )
        : results
  }
  expect(outcomes).toEqual({
    'broken': [
      {name: 'marked', status: 'expected'},
      {name: 'ordinary', status: 'expected'},
    ],
    'fixed': [
      {name: 'marked', status: 'unexpected'},
      {name: 'ordinary', status: 'expected'},
    ],
    'ordinary-broken': [
      {name: 'marked', status: 'expected'},
      {name: 'ordinary', status: 'unexpected'},
    ],
    'skip': [
      {name: 'marked', status: 'skipped'},
      {name: 'ordinary', status: 'expected'},
    ],
    'only': [{name: 'marked', status: 'expected'}],
    'stale': true,
  })
}, 180_000)
