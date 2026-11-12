import {describe, expect, test} from 'vitest'
import {parseRangeSegment, resolveRange} from './range-segment'

/**
 * The remaining items are what `@sanity/mutator` leaves of `['a', 'b', 'c',
 * 'd', 'e']` after an unset of the range.
 */
const items = ['a', 'b', 'c', 'd', 'e']

function remaining(segment: unknown) {
  const range = parseRangeSegment(segment)

  if (!range) {
    return undefined
  }

  const removed = new Set(resolveRange(range, items.length))

  return items.filter((_, index) => !removed.has(index))
}

describe(parseRangeSegment.name, () => {
  test.each([
    [
      [-2, ''],
      [-2, undefined],
    ],
    [
      ['', ''],
      [undefined, undefined],
    ],
    [
      [1, ''],
      [1, undefined],
    ],
    [
      ['', 2],
      [undefined, 2],
    ],
    [
      [1, 3],
      [1, 3],
    ],
  ])('parses %j', (segment, expected) => {
    expect(parseRangeSegment(segment)).toEqual(expected)
  })

  test.each([
    '1:',
    ':2',
    '1:3',
    '-2:',
    ':',
    'x',
    '',
    0,
    {_key: 'a'},
    null,
    [1],
    [1, 2, 3],
    [1.5, ''],
    ['a', ''],
    [1, null],
  ])('does not parse %j as a range', (segment) => {
    expect(parseRangeSegment(segment)).toBeUndefined()
  })
})

describe(resolveRange.name, () => {
  test.each([
    [[1, ''], ['a']],
    [
      [1, 3],
      ['a', 'd', 'e'],
    ],
    [
      ['', 2],
      ['c', 'd', 'e'],
    ],
    [[0, ''], []],
    [
      [-2, ''],
      ['a', 'b', 'c'],
    ],
    [
      [3, 1],
      ['a', 'b', 'c', 'd', 'e'],
    ],
    [
      [7, ''],
      ['a', 'b', 'c', 'd', 'e'],
    ],
    [
      [2, 2],
      ['a', 'b', 'c', 'd', 'e'],
    ],
    [[1, 99], ['a']],
  ])('%j leaves the items Content Lake leaves', (segment, expected) => {
    expect(remaining(segment)).toEqual(expected)
  })

  test('an empty array has nothing to resolve', () => {
    expect(resolveRange([1, undefined], 0)).toEqual([])
  })
})
