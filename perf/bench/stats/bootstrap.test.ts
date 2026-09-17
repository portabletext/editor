import {describe, expect, test} from 'vitest'
import {bootstrapDiffOfMedians} from './bootstrap'
import {mulberry32} from './rng'

describe('bootstrapDiffOfMedians', () => {
  test('the same seed and the same input produce an identical interval', () => {
    const referenceSessions = [
      [30, 32, 31],
      [29, 33, 30],
      [31, 31, 32],
      [30, 34, 29],
    ]
    const experimentSessions = [
      [36, 38, 35],
      [37, 39, 36],
      [35, 40, 37],
      [38, 36, 39],
    ]

    const first = bootstrapDiffOfMedians({
      referenceSessions,
      experimentSessions,
      rng: mulberry32(1234),
      iterations: 500,
    })
    const second = bootstrapDiffOfMedians({
      referenceSessions,
      experimentSessions,
      rng: mulberry32(1234),
      iterations: 500,
    })

    expect(second).toEqual(first)
  })

  test('a real difference produces a confidence interval excluding zero', () => {
    const referenceSessions = [
      [30, 32, 31, 30, 29],
      [31, 33, 30, 32, 31],
      [29, 31, 32, 30, 33],
      [30, 32, 31, 29, 30],
    ]
    const experimentSessions = [
      [50, 52, 51, 50, 49],
      [51, 53, 50, 52, 51],
      [49, 51, 52, 50, 53],
      [50, 52, 51, 49, 50],
    ]

    const interval = bootstrapDiffOfMedians({
      referenceSessions,
      experimentSessions,
      rng: mulberry32(99),
      iterations: 1000,
    })

    expect(interval).toEqual({
      diff: 20,
      lo: 19,
      hi: 21,
      level: 0.95,
      iterations: 1000,
    })
  })

  test('throws when a side has no sessions', () => {
    expect(() =>
      bootstrapDiffOfMedians({
        referenceSessions: [],
        experimentSessions: [[1, 2, 3]],
        rng: mulberry32(1),
      }),
    ).toThrow(/at least one session per side/)
  })
})
