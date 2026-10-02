import {describe, expect, test} from 'vitest'
import {assembleBundle, type ScenarioResult} from './bundle.ts'

describe(assembleBundle.name, () => {
  test('a passing scenario passes the run', () => {
    expect(
      assembleBundle({
        ...run,
        results: [passingResult('foo')],
        runError: undefined,
        unhandledErrors: [],
      }),
    ).toEqual({
      car: 'core',
      browser: 'chromium',
      commit: 'abc1234',
      feature: 'foo.feature',
      scenarios: ['foo'],
      startedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 100,
      completed: true,
      assertionCount: 1,
      passed: true,
      warnings: [],
      unhandledErrors: [],
      results: [passingResult('foo')],
    })
  })

  test('an unhandled error fails a run whose scenarios passed', () => {
    expect(
      assembleBundle({
        ...run,
        results: [passingResult('foo')],
        runError: undefined,
        unhandledErrors: ['boom'],
      }),
    ).toEqual({
      car: 'core',
      browser: 'chromium',
      commit: 'abc1234',
      feature: 'foo.feature',
      scenarios: ['foo'],
      startedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 100,
      completed: false,
      assertionCount: 1,
      passed: false,
      error: 'Unhandled error: boom',
      warnings: [],
      unhandledErrors: ['boom'],
      results: [passingResult('foo')],
    })
  })

  test('a failed failure capture keeps the original failure', () => {
    const failedResult: ScenarioResult = {
      ...passingResult('foo'),
      completed: false,
      passed: false,
      failedStep: 'two editors',
      error: 'strict mode violation',
      captureError: 'capture failed',
    }

    expect(
      assembleBundle({
        ...run,
        results: [failedResult, passingResult('bar')],
        runError: undefined,
        unhandledErrors: [],
      }),
    ).toEqual({
      car: 'core',
      browser: 'chromium',
      commit: 'abc1234',
      feature: 'foo.feature',
      scenarios: ['foo', 'bar'],
      startedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 100,
      completed: false,
      assertionCount: 2,
      passed: false,
      failedStep: 'two editors',
      error: 'strict mode violation',
      warnings: [],
      unhandledErrors: [],
      results: [failedResult, passingResult('bar')],
    })
  })

  test('a scenario without assertions fails the run', () => {
    const result: ScenarioResult = {
      ...passingResult('foo'),
      assertionCount: 0,
      passed: false,
      warnings: ['no assertions'],
    }

    expect(
      assembleBundle({
        ...run,
        results: [result, passingResult('bar')],
        runError: undefined,
        unhandledErrors: [],
      }),
    ).toEqual({
      car: 'core',
      browser: 'chromium',
      commit: 'abc1234',
      feature: 'foo.feature',
      scenarios: ['foo', 'bar'],
      startedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 100,
      completed: true,
      assertionCount: 1,
      passed: false,
      warnings: ['foo: no assertions'],
      unhandledErrors: [],
      results: [result, passingResult('bar')],
    })
  })

  test('a run error without results fails the run', () => {
    expect(
      assembleBundle({
        ...run,
        results: [],
        runError: 'Could not read the feature file',
        unhandledErrors: [],
      }),
    ).toEqual({
      car: 'core',
      browser: 'chromium',
      commit: 'abc1234',
      feature: 'foo.feature',
      scenarios: [],
      startedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 100,
      completed: false,
      assertionCount: 0,
      passed: false,
      error: 'Could not read the feature file',
      warnings: [],
      unhandledErrors: [],
      results: [],
    })
  })
})

const run = {
  browser: 'chromium',
  commit: 'abc1234',
  feature: 'foo.feature',
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  durationMs: 100,
} as const

function passingResult(scenario: string): ScenarioResult {
  return {
    scenario,
    startedAt: '2026-01-01T00:00:00.000Z',
    durationMs: 10,
    completed: true,
    assertionCount: 1,
    passed: true,
    warnings: [],
    checkpoints: [],
    events: [],
    console: [],
  }
}
