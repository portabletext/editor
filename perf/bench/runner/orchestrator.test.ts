import type {Browser} from 'playwright'
import {describe, expect, test} from 'vitest'
import {mulberry32} from '../stats/rng'
import {runAbScenario} from './orchestrator'
import type {SessionResult} from './session'

const TARGET = {blockIndex: 0, position: 'end'} as const
const REFERENCE_URL = 'http://reference.test'
const EXPERIMENT_URL = 'http://experiment.test'

/** Identical latencies on both sides — every comparison is a zero diff. */
function identicalSessionRunner(calls: string[]) {
  return async (options: {url: string}): Promise<SessionResult> => {
    calls.push(options.url === REFERENCE_URL ? 'reference' : 'experiment')
    return {samples: [16, 16, 16], belowFloorCount: 0}
  }
}

/** Wildly different latencies per side — would gate as a decided verdict if underpowered. */
function divergentSessionRunner(calls: string[]) {
  return async (options: {url: string}): Promise<SessionResult> => {
    const side = options.url === REFERENCE_URL ? 'reference' : 'experiment'
    calls.push(side)
    return {
      samples: side === 'reference' ? [16, 16, 16] : [1000, 1000, 1000],
      belowFloorCount: 0,
    }
  }
}

describe('runAbScenario', () => {
  test('alternates which side runs first each round', async () => {
    const calls: string[] = []
    const result = await runAbScenario({
      browser: {} as Browser,
      scenarioName: 'plain',
      referenceUrl: REFERENCE_URL,
      experimentUrl: EXPERIMENT_URL,
      target: TARGET,
      instrumentationSource: '',
      rng: mulberry32(1),
      runSession: identicalSessionRunner(calls),
      config: {minSessionsPerSide: 4, maxSessionsPerSide: 4, budgetMs: 60_000},
    })

    expect(calls).toEqual([
      'reference',
      'experiment',
      'experiment',
      'reference',
      'reference',
      'experiment',
      'experiment',
      'reference',
    ])
    expect(result.stoppedBy).toBe('converged')
    expect(result.referenceSessions).toEqual([
      [16, 16, 16],
      [16, 16, 16],
      [16, 16, 16],
      [16, 16, 16],
    ])
    expect(result.experimentSessions).toEqual([
      [16, 16, 16],
      [16, 16, 16],
      [16, 16, 16],
      [16, 16, 16],
    ])
  })

  test('stops as soon as the bootstrap interval converges, below the session cap', async () => {
    const calls: string[] = []
    const result = await runAbScenario({
      browser: {} as Browser,
      scenarioName: 'plain',
      referenceUrl: REFERENCE_URL,
      experimentUrl: EXPERIMENT_URL,
      target: TARGET,
      instrumentationSource: '',
      rng: mulberry32(1),
      runSession: identicalSessionRunner(calls),
      config: {
        minSessionsPerSide: 2,
        maxSessionsPerSide: 20,
        budgetMs: 60_000,
      },
    })

    expect(result.stoppedBy).toBe('converged')
    expect(result.referenceSessions.length).toBe(2)
    expect(result.experimentSessions.length).toBe(2)
    expect(calls.length).toBe(4)
  })

  test('reports max-sessions when the cap is hit before minSessionsPerSide', async () => {
    const calls: string[] = []
    const result = await runAbScenario({
      browser: {} as Browser,
      scenarioName: 'plain',
      referenceUrl: REFERENCE_URL,
      experimentUrl: EXPERIMENT_URL,
      target: TARGET,
      instrumentationSource: '',
      rng: mulberry32(1),
      runSession: identicalSessionRunner(calls),
      config: {
        minSessionsPerSide: 6,
        maxSessionsPerSide: 2,
        budgetMs: 60_000,
      },
    })

    expect(result.stoppedBy).toBe('max-sessions')
    expect(result.referenceSessions.length).toBe(2)
    expect(result.experimentSessions.length).toBe(2)
    expect(calls.length).toBe(4)
  })

  test('reports inconclusive when the budget ends the loop below minSessionsPerSide, even with wildly divergent sides', async () => {
    const calls: string[] = []
    const result = await runAbScenario({
      browser: {} as Browser,
      scenarioName: 'plain',
      referenceUrl: REFERENCE_URL,
      experimentUrl: EXPERIMENT_URL,
      target: TARGET,
      instrumentationSource: '',
      rng: mulberry32(1),
      runSession: divergentSessionRunner(calls),
      config: {
        minSessionsPerSide: 6,
        maxSessionsPerSide: 20,
        budgetMs: -1,
      },
    })

    expect(result.stoppedBy).toBe('budget')
    expect(result.referenceSessions.length).toBeLessThan(6)
    expect(result.experimentSessions.length).toBeLessThan(6)
    expect(result.comparison.verdict).toBe('inconclusive')
  })
})
