import {execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {Writable} from 'node:stream'
import {fileURLToPath} from 'node:url'
import {stripVTControlCharacters} from 'node:util'
import react from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'
import {startVitest, type BrowserCommand, type Vitest} from 'vitest/node'
import {COMPILED_SOURCES} from '../../../packages/editor/react-compiler-sources.ts'
import {
  assembleBundle,
  type BrowserName,
  type EvidenceBundle,
  type RacetrackReport,
  type ScenarioResult,
} from './bundle.ts'

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const repoRoot = path.resolve(appDirectory, '../..')

export async function run({
  featurePath,
  browser,
  outPath,
  verbose,
  stepTimeout,
}: {
  featurePath: string
  browser: BrowserName
  outPath: string | undefined
  verbose: boolean
  stepTimeout: number
}): Promise<{
  bundle: EvidenceBundle
  bundlePath: string | undefined
  writeError: string | undefined
}> {
  const startedAt = new Date()
  const runId = `${startedAt.toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`
  const outcome = await readFeature(featurePath).then((featureText) =>
    featureText.ok
      ? runFeatureInBrowser({
          featureText: featureText.value,
          runId,
          browser,
          verbose,
          stepTimeout,
        })
      : {results: [], runError: featureText.error, unhandledErrors: []},
  )

  const bundle = assembleBundle({
    browser,
    commit: readCommit(),
    feature: displayPath(featurePath),
    startedAt,
    durationMs: Date.now() - startedAt.getTime(),
    ...outcome,
  })

  const bundlePath = path.resolve(
    outPath ??
      path.join(
        appDirectory,
        '.runs',
        `${runId}-${path.basename(featurePath, '.feature')}.json`,
      ),
  )

  try {
    await mkdir(path.dirname(bundlePath), {recursive: true})
    await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, {
      flag: outPath === undefined ? 'wx' : 'w',
    })
  } catch (error) {
    const writeError = `Could not write the evidence bundle: ${describeError(error)}`

    return {
      bundle: {
        ...bundle,
        passed: false,
        error:
          bundle.error === undefined
            ? writeError
            : `${bundle.error}\n${writeError}`,
      },
      bundlePath: undefined,
      writeError,
    }
  }

  return {bundle, bundlePath, writeError: undefined}
}

async function readFeature(
  featurePath: string,
): Promise<{ok: true; value: string} | {ok: false; error: string}> {
  try {
    return {ok: true, value: await readFile(featurePath, 'utf8')}
  } catch (error) {
    return {
      ok: false,
      error: `Could not read the feature file: ${describeError(error)}`,
    }
  }
}

async function runFeatureInBrowser({
  featureText,
  runId,
  browser,
  verbose,
  stepTimeout,
}: {
  featureText: string
  runId: string
  browser: BrowserName
  verbose: boolean
  stepTimeout: number
}): Promise<{
  results: Array<ScenarioResult>
  runError: string | undefined
  unhandledErrors: Array<string>
}> {
  const generatedDirectory = path.join(appDirectory, '.generated')
  const testFile = path.join(generatedDirectory, `${runId}.test.ts`)
  const reports: Array<RacetrackReport> = []
  const racetrackReport: BrowserCommand<[RacetrackReport]> = (
    _context,
    report,
  ) => {
    reports.push(report)
  }
  const vitestOutput = new BufferedOutput()
  const testErrors: Array<string> = []
  const unhandledErrors: Array<string> = []
  let vitest: Vitest | undefined

  try {
    await mkdir(generatedDirectory, {recursive: true})
    await writeFile(testFile, generateTest({featureText, stepTimeout}), {
      flag: 'wx',
    })

    vitest = await startVitest(
      'test',
      [],
      {root: appDirectory, config: false, run: true, watch: false},
      defineConfig({
        test: {
          projects: [
            {
              plugins: [
                react({compiler: {target: '19', sources: COMPILED_SOURCES}}),
              ],
              resolve: {tsconfigPaths: true},
              test: {
                name: 'racetrack',
                include: [path.relative(appDirectory, testFile)],
                // Racetrack bounds every step itself and reports what did not
                // run. A Vitest deadline would start the next scenario while a
                // timed-out step is still acting on the page.
                testTimeout: 0,
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright(),
                  instances: [{browser}],
                  screenshotFailures: false,
                  commands: {racetrackReport},
                },
              },
            },
          ],
        },
      }),
      {stdout: vitestOutput, stderr: vitestOutput},
    )

    for (const task of vitest.state.getFiles().flatMap(flattenTasks)) {
      for (const error of task.result?.errors ?? []) {
        testErrors.push(describeError(error))
      }
    }
    for (const error of vitest.state.getUnhandledErrors()) {
      unhandledErrors.push(describeError(error))
    }
  } catch (error) {
    testErrors.push(describeError(error))
  } finally {
    try {
      await vitest?.close()
    } catch (error) {
      testErrors.push(describeError(error))
    }
    await rm(testFile, {force: true}).catch(() => {})
  }

  const results = reports.flatMap((report) =>
    report.type === 'scenario' ? [report.result] : [],
  )
  const compileError = reports.find((report) => report.type === 'compile error')

  if (verbose || (results.length === 0 && !compileError)) {
    process.stderr.write(vitestOutput.text())
  }

  return {
    results,
    unhandledErrors,
    runError:
      compileError?.type === 'compile error'
        ? compileError.error
        : testErrors.length > 0 || results.length === 0
          ? describeRunFailure({
              errors: testErrors,
              viteErrors: readViteErrors(vitestOutput.text()),
            })
          : undefined,
  }
}

type Task = ReturnType<Vitest['state']['getFiles']>[number]['tasks'][number]

function flattenTasks(task: Task): Array<Task> {
  return [task, ...('tasks' in task ? task.tasks.flatMap(flattenTasks) : [])]
}

function describeError(error: unknown): string {
  const lines: Array<string> = []
  let current: unknown = error

  while (current !== undefined && current !== null && lines.length < 5) {
    const message =
      typeof current === 'object' && 'message' in current
        ? String(current.message)
        : String(current)
    lines.push(lines.length === 0 ? message : `Caused by: ${message}`)
    current =
      typeof current === 'object' && 'cause' in current
        ? current.cause
        : undefined
  }

  return lines.join('\n')
}

/**
 * A module that fails to resolve or transform surfaces in the browser only as
 * "Failed to import test file". The reason is in Vite's log, so those lines
 * go into the bundle next to it.
 */
function readViteErrors(output: string): Array<string> {
  const errors = new Set<string>()

  for (const line of stripVTControlCharacters(output).split('\n')) {
    const match =
      /\[vite\] (?:\(\w+\) )?(?:Internal server|Pre-transform) error: (.*)$/.exec(
        line,
      )
    if (match?.[1]) {
      errors.add(match[1].trim())
    }
  }

  return [...errors]
}

function describeRunFailure({
  errors,
  viteErrors,
}: {
  errors: Array<string>
  viteErrors: Array<string>
}): string {
  const lines = errors.length > 0 ? errors : ['No scenario reported a result']

  return [
    ...lines,
    ...viteErrors.map((viteError) => `Vite: ${viteError}`),
  ].join('\n')
}

function generateTest({
  featureText,
  stepTimeout,
}: {
  featureText: string
  stepTimeout: number
}): string {
  return [
    `import {runFeature} from '../src/harness/run-feature.ts'`,
    ``,
    `runFeature(${JSON.stringify({featureText, stepTimeout})})`,
    ``,
  ].join('\n')
}

function readCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

function displayPath(featurePath: string): string {
  const relative = path.relative(repoRoot, featurePath)
  return relative.startsWith('..') || path.isAbsolute(relative)
    ? featurePath
    : relative
}

/**
 * Holds vitest's own output so stdout stays clean for the bundle.
 */
class BufferedOutput extends Writable {
  private chunks: Array<string> = []

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: () => void,
  ) {
    this.chunks.push(chunk.toString())
    callback()
  }

  text(): string {
    return this.chunks.join('')
  }
}
