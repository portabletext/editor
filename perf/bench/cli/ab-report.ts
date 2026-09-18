// oxlint-disable no-console
import {type AbScenarioResult} from '../runner/orchestrator'
import {summarize} from '../stats/quantiles'
import type {BenchScenarioResult} from './types'

export function printVerdictRow(
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

export function toScenarioResult(
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
