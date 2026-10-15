import path from 'node:path'
import {parseArgs} from 'node:util'
import type {BrowserName, EvidenceBundle} from './bundle.ts'
import {run} from './run.ts'
import {formatStepCatalogue, readStepCatalogue} from './steps.ts'

const usage = `Usage:
  racetrack run <file.feature> [--browser chromium|firefox|webkit] [--json] [--out <path>] [--step-timeout <ms>] [--verbose]
  racetrack steps [--json]
`

const browsers: ReadonlyArray<BrowserName> = ['chromium', 'firefox', 'webkit']

process.exitCode = await main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(
    `racetrack: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  return 1
})

async function main(argv: Array<string>): Promise<number> {
  const {positionals, values} = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'browser': {type: 'string', default: 'chromium'},
      'json': {type: 'boolean', default: false},
      'out': {type: 'string'},
      'step-timeout': {type: 'string', default: '20000'},
      'verbose': {type: 'boolean', default: false},
      'help': {type: 'boolean', short: 'h', default: false},
    },
  })
  const [command, ...rest] = positionals

  if (values.help || command === undefined) {
    process.stdout.write(usage)
    return values.help ? 0 : 1
  }

  if (command === 'steps') {
    const catalogue = await readStepCatalogue()
    process.stdout.write(
      values.json
        ? `${JSON.stringify(catalogue, null, 2)}\n`
        : formatStepCatalogue(catalogue),
    )
    return 0
  }

  if (command === 'run') {
    const [featureArgument] = rest
    const browser = browsers.find((name) => name === values.browser)
    const stepTimeout = Number(values['step-timeout'])

    if (
      featureArgument === undefined ||
      rest.length > 1 ||
      !browser ||
      !Number.isInteger(stepTimeout) ||
      stepTimeout <= 0
    ) {
      process.stderr.write(usage)
      return 1
    }

    const {bundle, bundlePath, writeError} = await run({
      featurePath: resolveFromInvocation(featureArgument),
      browser,
      verbose: values.verbose,
      stepTimeout,
      outPath:
        values.out === undefined
          ? undefined
          : resolveFromInvocation(values.out),
    })

    process.stdout.write(
      values.json
        ? `${JSON.stringify(bundle, null, 2)}\n`
        : formatSummary({bundle, bundlePath, writeError}),
    )
    return bundle.passed ? 0 : 1
  }

  process.stderr.write(usage)
  return 1
}

/**
 * `pnpm` runs scripts from the package directory and records where it was
 * invoked in `INIT_CWD`, so relative paths resolve against that.
 */
function resolveFromInvocation(filePath: string): string {
  return path.resolve(process.env['INIT_CWD'] ?? process.cwd(), filePath)
}

function formatSummary({
  bundle,
  bundlePath,
  writeError,
}: {
  bundle: EvidenceBundle
  bundlePath: string | undefined
  writeError: string | undefined
}): string {
  const lines = [
    `${bundle.passed ? 'PASSED' : 'FAILED'}  ${bundle.feature} (${bundle.browser}, ${bundle.commit}, ${bundle.durationMs}ms)`,
  ]

  for (const result of bundle.results) {
    if (result.notRun !== undefined) {
      lines.push(`  not run  ${result.scenario}: ${result.notRun}`)
      continue
    }
    lines.push(
      `  ${result.passed ? 'passed' : 'failed'}  ${result.scenario}: ${result.assertionCount} assertion(s), ${result.checkpoints.length} checkpoint(s), ${result.events.length} event(s)`,
    )
    if (result.failedStep !== undefined) {
      lines.push(`    failed step: ${result.failedStep}`)
    }
    if (result.error !== undefined) {
      lines.push(`    error: ${result.error.split('\n')[0]}`)
    }
    if (result.captureError !== undefined) {
      lines.push(
        `    failure capture failed: ${result.captureError.split('\n')[0]}`,
      )
    }
    for (const warning of result.warnings) {
      lines.push(`    warning: ${warning}`)
    }
  }

  if (bundle.results.length === 0 && bundle.error !== undefined) {
    lines.push(`  error: ${bundle.error.split('\n').join('\n    ')}`)
  }
  for (const unhandledError of bundle.unhandledErrors) {
    lines.push(`  unhandled error: ${unhandledError.split('\n')[0]}`)
  }

  lines.push(
    bundlePath === undefined
      ? `Evidence not written: ${writeError ?? 'unknown reason'}`
      : `Evidence: ${bundlePath}`,
  )
  return `${lines.join('\n')}\n`
}
