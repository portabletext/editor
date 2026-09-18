import {describe, expect, test} from 'vitest'
import {median, quantile, summarize} from './quantiles'

describe('quantile (type-7)', () => {
  test('interpolates linearly between ranks', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3)
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75)
  })

  test('is exact at the minimum and maximum', () => {
    expect(quantile([7, 3, 9, 1], 0)).toBe(1)
    expect(quantile([7, 3, 9, 1], 1)).toBe(9)
  })

  test('sorts its input instead of assuming it is already sorted', () => {
    expect(quantile([5, 3, 1, 4, 2], 0.5)).toBe(3)
  })

  test('does not mutate its input', () => {
    const values = [3, 1, 2]
    median(values)
    expect(values).toEqual([3, 1, 2])
  })

  test('throws on an empty sample', () => {
    expect(() => quantile([], 0.5)).toThrow()
  })

  test('throws on a non-finite sample instead of letting NaN reach the gate', () => {
    expect(() => quantile([1, Number.NaN, 3], 0.5)).toThrow(/non-finite/)
    expect(() => quantile([Number.POSITIVE_INFINITY], 0.5)).toThrow(
      /non-finite/,
    )
  })

  test('throws on an out-of-range probability', () => {
    expect(() => quantile([1, 2, 3], -0.1)).toThrow(/in \[0, 1\]/)
    expect(() => quantile([1, 2, 3], 1.5)).toThrow(/in \[0, 1\]/)
  })
})

describe('summarize', () => {
  test('reports the full quantile summary against hand-computed values', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(summarize(values)).toEqual({
      n: 10,
      min: 10,
      median: 55,
      p75: 77.5,
      p90: 91,
      p99: 99.1,
      max: 100,
    })
  })
})
