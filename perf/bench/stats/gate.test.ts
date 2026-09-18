import {describe, expect, test} from 'vitest'
import type {DiffInterval} from './bootstrap'
import {
  gate,
  hasDecidedVerdict,
  hasRegressionVerdict,
  isDecidedVerdict,
  KEYSTROKE_LATENCY_THRESHOLDS,
  shouldStop,
} from './gate'

function interval(diff: number, lo: number, hi: number): DiffInterval {
  return {diff, lo, hi, level: 0.95, iterations: 2000}
}

describe('gate', () => {
  test('regression: the CI excludes zero and the effect clears both floors', () => {
    expect(gate(interval(24, 16, 32), 32, KEYSTROKE_LATENCY_THRESHOLDS)).toBe(
      'regression',
    )
  })

  test('improvement: the CI excludes zero on the negative side and clears both floors', () => {
    expect(
      gate(interval(-24, -32, -16), 32, KEYSTROKE_LATENCY_THRESHOLDS),
    ).toBe('improvement')
  })

  test('inconclusive: the CI is wide enough to still hide an effect at the minimum size', () => {
    expect(gate(interval(2, -20, 24), 32, KEYSTROKE_LATENCY_THRESHOLDS)).toBe(
      'inconclusive',
    )
  })

  test('neutral: the CI excludes zero but the effect is below the minimum size', () => {
    expect(gate(interval(1, 0.5, 1.5), 32, KEYSTROKE_LATENCY_THRESHOLDS)).toBe(
      'neutral',
    )
  })

  test('neutral: the CI includes zero and is tight', () => {
    expect(gate(interval(0, -4, 4), 32, KEYSTROKE_LATENCY_THRESHOLDS)).toBe(
      'neutral',
    )
  })

  test('the relative floor dominates the absolute one above a 320ms reference median', () => {
    // referenceMedian 400: minimumEffect = max(16, 0.05 * 400) = 20
    expect(gate(interval(19, 8, 30), 400, KEYSTROKE_LATENCY_THRESHOLDS)).toBe(
      'neutral',
    )
    expect(gate(interval(20, 8, 32), 400, KEYSTROKE_LATENCY_THRESHOLDS)).toBe(
      'regression',
    )
  })
})

describe('shouldStop', () => {
  test('stops once the half-width is at or below the decision bound', () => {
    expect(
      shouldStop(interval(0, -16, 16), 32, KEYSTROKE_LATENCY_THRESHOLDS),
    ).toBe(true)
  })

  test('keeps sampling while the half-width still exceeds the decision bound', () => {
    expect(
      shouldStop(interval(0, -16.1, 16.1), 32, KEYSTROKE_LATENCY_THRESHOLDS),
    ).toBe(false)
  })
})

describe('isDecidedVerdict', () => {
  test('only regression and improvement count as decided', () => {
    expect(isDecidedVerdict('regression')).toBe(true)
    expect(isDecidedVerdict('improvement')).toBe(true)
    expect(isDecidedVerdict('neutral')).toBe(false)
    expect(isDecidedVerdict('inconclusive')).toBe(false)
    expect(isDecidedVerdict(undefined)).toBe(false)
  })
})

describe('hasDecidedVerdict', () => {
  test('fails the self-test as soon as one scenario is decided', () => {
    expect(hasDecidedVerdict(['neutral', 'inconclusive', 'regression'])).toBe(
      true,
    )
    expect(hasDecidedVerdict(['neutral', 'improvement'])).toBe(true)
  })

  test('passes the self-test when no scenario is decided', () => {
    expect(hasDecidedVerdict(['neutral', 'inconclusive'])).toBe(false)
    expect(hasDecidedVerdict([])).toBe(false)
  })
})

describe('hasRegressionVerdict', () => {
  test('fails ab as soon as one scenario regresses', () => {
    expect(
      hasRegressionVerdict(['neutral', 'inconclusive', 'regression']),
    ).toBe(true)
  })

  test('does not fail ab on an improvement — unlike self-test, a real change is expected to move the numbers', () => {
    expect(hasRegressionVerdict(['neutral', 'improvement'])).toBe(false)
  })

  test('passes when every scenario is neutral or inconclusive', () => {
    expect(hasRegressionVerdict(['neutral', 'inconclusive'])).toBe(false)
    expect(hasRegressionVerdict([])).toBe(false)
  })
})
