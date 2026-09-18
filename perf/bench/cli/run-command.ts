import {parseArgs} from 'node:util'
import type {Browser} from 'playwright'
import {
  calibrateHost,
  calibrateHostThrottled,
  launchBrowser,
} from '../runner/browser'
import {bundleInstrumentation} from '../runner/bundle-instrumentation'
import {DEFAULT_ORCHESTRATOR_CONFIG} from '../runner/orchestrator'
import {withSessionRetry} from '../runner/retry'
import {DEFAULT_SESSION_CONFIG, runTypingSession} from '../runner/session'
import {serveHostDist} from '../runner/static-server'
import {countBlocks, getScenario, scenarios} from '../scenarios'
import {summarize} from '../stats/quantiles'
import {buildHost} from './build-host'
import {computeRunId, readGitInfo} from './git-info'
import {readRunnerInfo} from './runner-info'
import type {BenchRun, BenchScenarioResult} from './types'
import {writeBenchRun} from './write-result'

export async function runCommand(argv: string[]): Promise<void> {
  const {values} = parseArgs({
    args: argv,
    options: {
      scenario: {type: 'string', multiple: true},
      all: {type: 'boolean'},
      out: {type: 'string'},
      headed: {type: 'boolean'},
      trace: {type: 'boolean'},
    },
  })

  const scenarioNames = resolveScenarioNames(values.scenario, values.all)
  const startedAt = new Date().toISOString()

  console.log('Building host...')
  const distDir = await buildHost()
  const server = await serveHostDist(distDir)
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

    const scenarioResults: BenchScenarioResult[] = []
    for (const scenarioName of scenarioNames) {
      scenarioResults.push(
        await runScenario({
          trace: values.trace ?? false,
          browser,
          server,
          instrumentationSource,
          scenarioName,
        }),
      )
    }

    const gitInfo = readGitInfo()
    const run: BenchRun = {
      schemaVersion: 1,
      mode: 'absolute',
      trigger: 'local',
      startedAt,
      finishedAt: new Date().toISOString(),
      git: gitInfo,
      runner: runnerInfo,
      config: {
        cpuThrottleRate: DEFAULT_SESSION_CONFIG.cpuThrottleRate,
        warmupKeystrokes: DEFAULT_SESSION_CONFIG.warmupKeystrokes,
        measuredKeystrokes: DEFAULT_SESSION_CONFIG.measuredKeystrokes,
        cadenceMs: DEFAULT_SESSION_CONFIG.cadenceMs,
      },
      scenarios: scenarioResults,
    }

    const runId = computeRunId('absolute', gitInfo.branch, gitInfo.sha)
    const filePath = await writeBenchRun(run, runId, values.out)
    console.log(`\nWrote ${filePath}`)
  } finally {
    await browser.close()
    await server.close()
  }
}

function resolveScenarioNames(
  requested: string[] | undefined,
  all: boolean | undefined,
): string[] {
  if (all || !requested || requested.length === 0) {
    return scenarios.map((scenario) => scenario.name)
  }
  return requested
}

async function runScenario(options: {
  browser: Browser
  server: {url: string}
  instrumentationSource: string
  scenarioName: string
  trace: boolean
}): Promise<BenchScenarioResult> {
  const scenario = getScenario(options.scenarioName)
  const sessionCount = DEFAULT_ORCHESTRATOR_CONFIG.minSessionsPerSide
  console.log(`\nScenario: ${scenario.name}`)

  const sessions: number[][] = []
  let belowFloorCount = 0
  for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex++) {
    const result = await withSessionRetry({
      label: `${scenario.name} session`,
      run: () =>
        runTypingSession({
          browser: options.browser,
          url: options.server.url,
          scenarioName: scenario.name,
          target: scenario.target,
          instrumentationSource: options.instrumentationSource,
          traceFile: options.trace
            ? `results/trace-${scenario.name}-session-${sessionIndex + 1}.zip`
            : undefined,
        }),
      onFailure: (error, attempt) => {
        const message = error instanceof Error ? error.message : String(error)
        console.log(
          `  session ${sessionIndex + 1}/${sessionCount} failed (attempt ${attempt}), retrying — ${message}`,
        )
      },
    })
    sessions.push(result.samples)
    belowFloorCount += result.belowFloorCount
    console.log(
      `  session ${sessionIndex + 1}/${sessionCount}: ${result.samples.length} samples, ` +
        `${result.belowFloorCount} below floor`,
    )
  }

  const summary = summarize(sessions.flat())
  console.log(
    `  median ${summary.median.toFixed(1)}ms, p75 ${summary.p75.toFixed(1)}ms, ` +
      `p90 ${summary.p90.toFixed(1)}ms, p99 ${summary.p99.toFixed(1)}ms, ` +
      `belowFloorCount ${belowFloorCount}`,
  )

  return {
    name: scenario.name,
    source: 'core',
    blockCount: countBlocks(scenario),
    metrics: [
      {
        label: 'keydown-to-paint',
        unit: 'ms',
        experiment: {sessions, summary, belowFloorCount},
      },
    ],
  }
}
