// oxlint-disable no-console
import fs from 'node:fs'
import path from 'node:path'
import {parseArgs} from 'node:util'
import {
  calibrateHost,
  calibrateHostThrottled,
  launchBrowser,
} from '../runner/browser'
import {bundleInstrumentation} from '../runner/bundle-instrumentation'
import {runAbScenario} from '../runner/orchestrator'
import {DEFAULT_SESSION_CONFIG} from '../runner/session'
import {serveHostDist} from '../runner/static-server'
import {countBlocks, getScenario} from '../scenarios'
import {hasRegressionVerdict, type Verdict} from '../stats/gate'
import {mulberry32} from '../stats/rng'
import {printVerdictRow, toScenarioResult} from './ab-report'
import {BENCH_ROOT} from './bench-root'
import {computeRunId, readCommittedAt, readGitInfo} from './git-info'
import {buildEditorAtRef} from './ref-build/build-host-at-ref'
import {readRunnerInfo} from './runner-info'
import {resolveScenarioNames} from './scenario-selection'
import type {BenchRun, BenchScenarioResult} from './types'
import {writeBenchRun} from './write-result'

const AB_SEED = 1

export async function abCommand(argv: string[]): Promise<void> {
  const {values} = parseArgs({
    args: argv,
    options: {
      'from': {type: 'string'},
      'to': {type: 'string'},
      'scenario': {type: 'string', multiple: true},
      'all': {type: 'boolean'},
      'out': {type: 'string'},
      'headed': {type: 'boolean'},
      'trace': {type: 'boolean'},
      'force-build': {type: 'boolean'},
    },
  })

  if (!values.from || !values.to) {
    console.error('bench ab requires --from <ref> and --to <ref>')
    process.exitCode = 1
    return
  }

  const scenarioNames = resolveScenarioNames(values.scenario, values.all)
  const startedAt = new Date().toISOString()
  const forceBuild = values['force-build'] ?? false

  console.log(`Building @portabletext/editor at --from ${values.from}...`)
  const reference = buildEditorAtRef(values.from, {
    forceBuild,
    log: console.log,
  })
  console.log(`Building @portabletext/editor at --to ${values.to}...`)
  const experiment = buildEditorAtRef(values.to, {forceBuild, log: console.log})

  const referenceServer = await serveHostDist(reference.hostDistDir)
  const experimentServer = await serveHostDist(experiment.hostDistDir)
  const browser = await launchBrowser({headed: values.headed})
  try {
    console.log('Calibrating host...')
    const calibrationMs = await calibrateHost(browser)
    const throttledCalibrationMs = await calibrateHostThrottled(
      browser,
      DEFAULT_SESSION_CONFIG.cpuThrottleRate,
    )
    console.log(
      `  unthrottled ${calibrationMs.toFixed(1)}ms, throttled ${throttledCalibrationMs.toFixed(1)}ms ` +
        `(${(throttledCalibrationMs / calibrationMs).toFixed(2)}x)`,
    )
    const instrumentationSource = await bundleInstrumentation()
    const runnerInfo = await readRunnerInfo(
      browser,
      calibrationMs,
      throttledCalibrationMs,
    )
    const rng = mulberry32(AB_SEED)

    const traceDir = values.trace ? path.join(BENCH_ROOT, 'results') : undefined
    if (traceDir) fs.mkdirSync(traceDir, {recursive: true})

    const scenarioResults: BenchScenarioResult[] = []
    const verdicts: Verdict[] = []
    console.log(
      `\nreference: ${values.from} (${reference.sha.slice(0, 12)})${reference.fromCache ? ' [tarballs cached]' : ''}`,
    )
    console.log(
      `experiment: ${values.to} (${experiment.sha.slice(0, 12)})${experiment.fromCache ? ' [tarballs cached]' : ''}`,
    )
    console.log(
      '\nscenario                 stopped      ref n exp n  ref median   diff [lo, hi]              verdict',
    )
    for (const scenarioName of scenarioNames) {
      const scenario = getScenario(scenarioName)
      const abResult = await runAbScenario({
        browser,
        scenarioName: scenario.name,
        referenceUrl: referenceServer.url,
        experimentUrl: experimentServer.url,
        target: scenario.target,
        instrumentationSource,
        rng,
        config: {traceDir},
        log: (message) => console.log(message),
      })
      verdicts.push(abResult.comparison.verdict)
      printVerdictRow(scenario.name, abResult)
      scenarioResults.push(
        toScenarioResult(scenario.name, countBlocks(scenario), abResult),
      )
    }

    const experimentGit = readGitInfo(experiment.sha)
    const gitInfo = {
      ...experimentGit,
      reference: {
        sha: reference.sha,
        committedAt: readCommittedAt(reference.sha),
      },
    }
    const run: BenchRun = {
      schemaVersion: 1,
      mode: 'ab',
      trigger: 'local',
      startedAt,
      finishedAt: new Date().toISOString(),
      git: gitInfo,
      runner: runnerInfo,
      config: {
        cpuThrottleRate: DEFAULT_SESSION_CONFIG.cpuThrottleRate,
        seed: AB_SEED,
        warmupKeystrokes: DEFAULT_SESSION_CONFIG.warmupKeystrokes,
        measuredKeystrokes: DEFAULT_SESSION_CONFIG.measuredKeystrokes,
        cadenceMs: DEFAULT_SESSION_CONFIG.cadenceMs,
      },
      scenarios: scenarioResults,
    }
    const runId = computeRunId('ab', gitInfo.branch, gitInfo.sha)
    const filePath = await writeBenchRun(run, runId, values.out)
    console.log(`\nWrote ${filePath}`)

    if (hasRegressionVerdict(verdicts)) {
      console.error('\nab: at least one scenario reported a regression verdict')
      process.exitCode = 1
      return
    }
    console.log('\nab: no regression verdicts')
  } finally {
    await browser.close()
    await referenceServer.close()
    await experimentServer.close()
    fs.rmSync(reference.hostDistDir, {recursive: true, force: true})
    fs.rmSync(experiment.hostDistDir, {recursive: true, force: true})
  }
}
