import type {Browser} from 'playwright'
import type {CaretTarget} from '../scenarios/types'
import {bootstrapDiffOfMedians, type DiffInterval} from '../stats/bootstrap'
import {
  gate,
  KEYSTROKE_LATENCY_THRESHOLDS,
  shouldStop,
  type Verdict,
} from '../stats/gate'
import {median} from '../stats/quantiles'
import type {Rng} from '../stats/rng'
import {withSessionRetry} from './retry'
import {runTypingSession, type SessionConfig} from './session'

export interface OrchestratorConfig {
  minSessionsPerSide: number
  maxSessionsPerSide: number
  /** Wall-clock budget (cap, not duration — the stopping rule exits early). */
  budgetMs: number
  sessionConfig: Partial<SessionConfig>
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  minSessionsPerSide: 6,
  maxSessionsPerSide: 20,
  budgetMs: 5 * 60_000,
  sessionConfig: {},
}

export interface AbScenarioResult {
  scenario: string
  referenceSessions: number[][]
  experimentSessions: number[][]
  referenceBelowFloorCount: number
  experimentBelowFloorCount: number
  comparison: DiffInterval & {verdict: Verdict}
  /** Why sampling stopped: converged, budget, or the session cap. */
  stoppedBy: 'converged' | 'budget' | 'max-sessions'
}

/**
 * Interleaved A/B sampling with dynamic stopping (tachometer-style):
 * alternate reference/experiment sessions on the same browser, and once
 * both sides have `minSessionsPerSide`, stop as soon as the bootstrap CI on
 * the difference of medians is tight enough to decide — or when the
 * budget/session cap is hit (in which case a wide CI surfaces as
 * `inconclusive`, never as a coin-flip verdict).
 *
 * Shape ported from sanity/perf/bench/runner/orchestrator.ts (runAbScenario)
 * — keep in sync, except for one intentional divergence: if the loop exits
 * (budget or session cap) before either side reaches `minSessionsPerSide`,
 * the returned comparison's verdict is forced to `inconclusive` regardless
 * of what the underpowered bootstrap computed (see the divergences list in
 * the README).
 */
export async function runAbScenario(options: {
  browser: Browser
  scenarioName: string
  referenceUrl: string
  experimentUrl: string
  target: CaretTarget
  instrumentationSource: string
  rng: Rng
  config?: Partial<OrchestratorConfig>
  log?: (message: string) => void
  /** Injectable for tests; defaults to the real Playwright-driven session. */
  runSession?: typeof runTypingSession
}): Promise<AbScenarioResult> {
  const config = {...DEFAULT_ORCHESTRATOR_CONFIG, ...options.config}
  const log = options.log ?? (() => {})
  const runSession = options.runSession ?? runTypingSession
  const startedAt = Date.now()

  const referenceSessions: number[][] = []
  const experimentSessions: number[][] = []
  let referenceBelowFloorCount = 0
  let experimentBelowFloorCount = 0
  let stoppedBy: AbScenarioResult['stoppedBy'] = 'converged'
  // The comparison that decided to stop is the one reported: `rng` is a
  // stateful stream, so recomputing after the loop would draw a different
  // bootstrap interval than the one that satisfied shouldStop.
  let comparison: (DiffInterval & {verdict: Verdict}) | undefined

  const runOneSession = async (
    side: 'reference' | 'experiment',
  ): Promise<void> => {
    const result = await withSessionRetry({
      label: `${options.scenarioName} ${side} session`,
      run: () =>
        runSession({
          browser: options.browser,
          url:
            side === 'reference' ? options.referenceUrl : options.experimentUrl,
          scenarioName: options.scenarioName,
          target: options.target,
          instrumentationSource: options.instrumentationSource,
          config: config.sessionConfig,
        }),
      onFailure: (error, attempt) => {
        const message = error instanceof Error ? error.message : String(error)
        log(
          `  ${side} session failed (attempt ${attempt}), retrying \u2014 ${message}`,
        )
      },
    })
    if (side === 'reference') {
      referenceSessions.push(result.samples)
      referenceBelowFloorCount += result.belowFloorCount
    } else {
      experimentSessions.push(result.samples)
      experimentBelowFloorCount += result.belowFloorCount
    }
  }

  const compare = (): DiffInterval & {verdict: Verdict} => {
    const referenceMedian = median(referenceSessions.flat())
    const interval = bootstrapDiffOfMedians({
      referenceSessions,
      experimentSessions,
      rng: options.rng,
    })
    return {
      ...interval,
      verdict: gate(interval, referenceMedian, KEYSTROKE_LATENCY_THRESHOLDS),
    }
  }

  for (let round = 0; round < config.maxSessionsPerSide; round++) {
    // Alternate which side goes first each round so neither side
    // systematically samples earlier (warmer caches, quieter host).
    const order: ('reference' | 'experiment')[] =
      round % 2 === 0
        ? ['reference', 'experiment']
        : ['experiment', 'reference']
    for (const side of order) {
      await runOneSession(side)
    }
    log(
      `  round ${round + 1}: ${referenceSessions.length} reference / ` +
        `${experimentSessions.length} experiment sessions ` +
        `(${((Date.now() - startedAt) / 1000).toFixed(0)}s)`,
    )

    if (referenceSessions.length >= config.minSessionsPerSide) {
      comparison = compare()
      const referenceMedian = median(referenceSessions.flat())
      if (
        shouldStop(comparison, referenceMedian, KEYSTROKE_LATENCY_THRESHOLDS)
      ) {
        stoppedBy = 'converged'
        break
      }
    }
    if (Date.now() - startedAt > config.budgetMs) {
      stoppedBy = 'budget'
      break
    }
    if (round === config.maxSessionsPerSide - 1) {
      stoppedBy = 'max-sessions'
    }
  }

  const finalComparison = comparison ?? compare()
  const underpowered =
    referenceSessions.length < config.minSessionsPerSide ||
    experimentSessions.length < config.minSessionsPerSide

  return {
    scenario: options.scenarioName,
    referenceSessions,
    experimentSessions,
    referenceBelowFloorCount,
    experimentBelowFloorCount,
    // A bootstrap CI on 1-2 sessions a side is degenerate (near-zero width),
    // so an underpowered exit (budget or cap hit below minSessionsPerSide)
    // can never report a decided verdict, however wide the point estimate:
    // force `inconclusive` while keeping diff/lo/hi for visibility.
    comparison: underpowered
      ? {...finalComparison, verdict: 'inconclusive'}
      : finalComparison,
    stoppedBy,
  }
}
