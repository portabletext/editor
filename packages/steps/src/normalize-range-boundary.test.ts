import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {normalizeRangeBoundary} from './normalize-range-boundary'

const value: Array<PortableTextBlock> = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: 's1', text: 'foo bar', marks: []},
      {_type: 'span', _key: 's2', text: 'baz', marks: ['strong']},
    ],
  },
]

const span1 = [{_key: 'b1'}, 'children', {_key: 's1'}]
const span2 = [{_key: 'b1'}, 'children', {_key: 's2'}]

describe(normalizeRangeBoundary.name, () => {
  test('represents an expanded range start at the preceding sibling end', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span2, offset: 0},
        focus: {path: span2, offset: 3},
      }),
    ).toEqual({
      anchor: {path: span1, offset: 7},
      focus: {path: span2, offset: 3},
    })
  })

  test('normalizes the focus of a backward range', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span2, offset: 3},
        focus: {path: span2, offset: 0},
      }),
    ).toEqual({
      anchor: {path: span2, offset: 3},
      focus: {path: span1, offset: 7},
    })
  })

  test('leaves a collapsed range at the next sibling start', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span2, offset: 0},
        focus: {path: span2, offset: 0},
      }),
    ).toEqual({
      anchor: {path: span2, offset: 0},
      focus: {path: span2, offset: 0},
    })
  })

  test('leaves an expanded range end at the next sibling start', () => {
    expect(
      normalizeRangeBoundary(value, {
        anchor: {path: span1, offset: 4},
        focus: {path: span2, offset: 0},
      }),
    ).toEqual({
      anchor: {path: span1, offset: 4},
      focus: {path: span2, offset: 0},
    })
  })

  test('recovers the next-sibling representation of a normalized start', () => {
    expect(
      normalizeRangeBoundary(
        value,
        {
          anchor: {path: span1, offset: 7},
          focus: {path: span2, offset: 3},
        },
        {representation: 'next'},
      ),
    ).toEqual({
      anchor: {path: span2, offset: 0},
      focus: {path: span2, offset: 3},
    })
  })
})
