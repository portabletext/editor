import {
  calibrateHost,
  calibrateHostThrottled,
  launchBrowser,
} from '../runner/browser'
import {bundleInstrumentation} from '../runner/bundle-instrumentation'
import {type AbScenarioResult, runAbScenario} from '../runner/orchestrator'
import {DEFAULT_SESSION_CONFIG} from '../runner/session'
import {serveHostDist} from '../runner/static-server'
import {countBlocks, scenarios} from '../scenarios'
import {hasDecidedVerdict, type Verdict} from '../stats/gate'
import {summarize} from '../stats/quantiles'
import {mulberry32} from '../stats/rng'
import {buildHost} from './build-host'
import {computeRunId, readGitInfo} from './git-info'
import {readRunnerInfo} from './runner-info'
import type {BenchRun, BenchScenarioResult} from './types'
import {writeBenchRun} from './write-result'

const SELF_TEST_SEED = 1

/**
 * A/Bs the same built dist against itself across every scenario. A decided
 * verdict (regression or improvement) here means the stats kernel or the
 * noise controls are broken, not that the product changed.
 */
export async function selfTestCommand(): Promise<void> {
  const startedAt = new Date().toISOString()

  console.log('Building host...')
  const distDir = await buildHost()
  const server = await serveHostDist(distDir)
  const browser = await launchBrowser()

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
    const rng = mulberry32(SELF_TEST_SEED)

    const scenarioResults: BenchScenarioResult[] = []
    const verdicts: Verdict[] = []
    console.log(
      '\nscenario                 stopped      ref n exp n  ref median   diff [lo, hi]              verdict',
    )
    for (const scenario of scenarios) {
      const abResult = await runAbScenario({
        browser,
        scenarioName: scenario.name,
        referenceUrl: server.url,
        experimentUrl: server.url,
        target: scenario.target,
        instrumentationSource,
        rng,
      })
      verdicts.push(abResult.comparison.verdict)
      printVerdictRow(scenario.name, abResult)
      scenarioResults.push(
        toScenarioResult(scenario.name, countBlocks(scenario), abResult),
      )
    }

    const gitInfo = readGitInfo()
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
        seed: SELF_TEST_SEED,
        warmupKeystrokes: DEFAULT_SESSION_CONFIG.warmupKeystrokes,
        measuredKeystrokes: DEFAULT_SESSION_CONFIG.measuredKeystrokes,
        cadenceMs: DEFAULT_SESSION_CONFIG.cadenceMs,
      },
      scenarios: scenarioResults,
    }
    const runId = computeRunId('ab', gitInfo.branch, gitInfo.sha)
    const filePath = await writeBenchRun(run, runId)
    console.log(`\nWrote ${filePath}`)

    if (hasDecidedVerdict(verdicts)) {
      console.error(
        '\nself-test FAILED: a build compared against itself produced a regression or improvement verdict',
      )
      process.exitCode = 1
      return
    }
    console.log('\nself-test passed: no regression/improvement verdicts')
  } finally {
    await browser.close()
    await server.close()
  }
}

function printVerdictRow(
  scenarioName: string,
  abResult: AbScenarioResult,
): void {
  const referenceMedian = summarize(abResult.referenceSessions.flat()).median
  const {comparison} = abResult
  console.log(
    `${scenarioName.padEnd(24)} ${abResult.stoppedBy.padEnd(12)} ` +
      `${String(abResult.referenceSessions.length).padStart(5)} ${String(abResult.experimentSessions.length).padStart(5)} ` +
      `${referenceMedian.toFixed(1).padStart(10)}ms  ` +
      `${comparison.diff.toFixed(1)}ms [${comparison.lo.toFixed(1)}, ${comparison.hi.toFixed(1)}]`.padEnd(
        26,
      ) +
      ` ${comparison.verdict}`,
  )
}

function toScenarioResult(
  scenarioName: string,
  blockCount: number,
  abResult: AbScenarioResult,
): BenchScenarioResult {
  const referenceSummary = summarize(abResult.referenceSessions.flat())
  const experimentSummary = summarize(abResult.experimentSessions.flat())
  return {
    name: scenarioName,
    source: 'core',
    blockCount,
    metrics: [
      {
        label: 'keydown-to-paint',
        unit: 'ms',
        experiment: {
          sessions: abResult.experimentSessions,
          summary: experimentSummary,
          belowFloorCount: abResult.experimentBelowFloorCount,
        },
        reference: {
          sessions: abResult.referenceSessions,
          summary: referenceSummary,
          belowFloorCount: abResult.referenceBelowFloorCount,
        },
        comparison: {
          diff: abResult.comparison.diff,
          lo: abResult.comparison.lo,
          hi: abResult.comparison.hi,
          verdict: abResult.comparison.verdict,
        },
      },
    ],
  }
}
