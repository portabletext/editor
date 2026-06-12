import {describe, expect, test} from 'vitest'
import {createNodeTraversalTestbed} from './node-traversal-testbed'
import {rangesOverlap} from './ranges-overlap'

describe(rangesOverlap.name, () => {
  const testbed = createNodeTraversalTestbed()
  const snapshot = testbed.snapshot

  // textBlock1 children: span1 "hello ", stockTicker1, span2 " world"
  const span1Path = [
    {_key: testbed.textBlock1._key},
    'children',
    {_key: testbed.span1._key},
  ]
  const span3Path = [
    {_key: testbed.textBlock2._key},
    'children',
    {_key: testbed.span3._key},
  ]

  test('returns false when rangeA is null', () => {
    const range = {
      anchor: {path: span1Path, offset: 0},
      focus: {path: span1Path, offset: 1},
    }
    expect(rangesOverlap(snapshot, null, range)).toBe(false)
  })

  test('returns false when rangeB is null', () => {
    const range = {
      anchor: {path: span1Path, offset: 0},
      focus: {path: span1Path, offset: 1},
    }
    expect(rangesOverlap(snapshot, range, null)).toBe(false)
  })

  test('disjoint ranges in the same span', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 1},
        },
        {
          anchor: {path: span1Path, offset: 2},
          focus: {path: span1Path, offset: 3},
        },
      ),
    ).toBe(false)
  })

  test('disjoint ranges across blocks', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 1},
        },
        {
          anchor: {path: span3Path, offset: 0},
          focus: {path: span3Path, offset: 1},
        },
      ),
    ).toBe(false)
  })

  test('touching at one endpoint counts as overlap', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 2},
        },
        {
          anchor: {path: span1Path, offset: 2},
          focus: {path: span1Path, offset: 3},
        },
      ),
    ).toBe(true)
  })

  test('partial overlap', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 2},
        },
        {
          anchor: {path: span1Path, offset: 1},
          focus: {path: span1Path, offset: 3},
        },
      ),
    ).toBe(true)
  })

  test('full containment', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 3},
        },
        {
          anchor: {path: span1Path, offset: 1},
          focus: {path: span1Path, offset: 2},
        },
      ),
    ).toBe(true)
  })

  test('identical ranges', () => {
    const range = {
      anchor: {path: span1Path, offset: 0},
      focus: {path: span1Path, offset: 3},
    }
    expect(rangesOverlap(snapshot, range, range)).toBe(true)
  })

  test('two collapsed ranges at the same point', () => {
    const point = {path: span1Path, offset: 1}
    expect(
      rangesOverlap(
        snapshot,
        {anchor: point, focus: point},
        {anchor: point, focus: point},
      ),
    ).toBe(true)
  })

  test('two collapsed ranges at different points', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 0},
        },
        {
          anchor: {path: span1Path, offset: 2},
          focus: {path: span1Path, offset: 2},
        },
      ),
    ).toBe(false)
  })

  test('collapsed range inside expanded range', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 0},
          focus: {path: span1Path, offset: 3},
        },
        {
          anchor: {path: span1Path, offset: 1},
          focus: {path: span1Path, offset: 1},
        },
      ),
    ).toBe(true)
  })

  test('backward range overlapping forward range', () => {
    expect(
      rangesOverlap(
        snapshot,
        {
          anchor: {path: span1Path, offset: 2},
          focus: {path: span1Path, offset: 0},
        },
        {
          anchor: {path: span1Path, offset: 1},
          focus: {path: span1Path, offset: 3},
        },
      ),
    ).toBe(true)
  })
})
