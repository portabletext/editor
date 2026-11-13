import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
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

  test('represents a collapsed range at the preceding sibling end when requested', () => {
    expect(
      normalizeRangeBoundary(
        value,
        {
          anchor: {path: span2, offset: 0},
          focus: {path: span2, offset: 0},
        },
        {normalizeCollapsed: true},
      ),
    ).toEqual({
      anchor: {path: span1, offset: 7},
      focus: {path: span1, offset: 7},
    })
  })

  test('recovers the next-sibling representation of a collapsed range when requested', () => {
    expect(
      normalizeRangeBoundary(
        value,
        {
          anchor: {path: span1, offset: 7},
          focus: {path: span1, offset: 7},
        },
        {representation: 'next', normalizeCollapsed: true},
      ),
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

describe(normalizeRangeBoundary.name, () => {
  test('custom span names normalize boundaries', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    expect(
      normalizeRangeBoundary(
        [
          {
            _type: 'block',
            _key: key0,
            children: [
              {_type: 'customSpan', _key: key1, text: 'foo', marks: []},
              {_type: 'customSpan', _key: key2, text: 'bar', marks: []},
            ],
            markDefs: [],
          },
        ],
        {
          anchor: {path: [{_key: key0}, 'children', {_key: key2}], offset: 0},
          focus: {path: [{_key: key0}, 'children', {_key: key2}], offset: 2},
        },
      ),
    ).toEqual({
      anchor: {path: [{_key: key0}, 'children', {_key: key1}], offset: 3},
      focus: {path: [{_key: key0}, 'children', {_key: key2}], offset: 2},
    })
  })
})

describe(normalizeRangeBoundary.name, () => {
  test('normalizes span boundaries inside an object field', () => {
    const keyGenerator = createTestKeyGenerator()
    const objectKey = keyGenerator()
    const blockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondSpanKey = keyGenerator()
    const value = [
      {
        _type: 'object',
        _key: objectKey,
        details: {
          body: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
                {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      },
    ]
    expect(
      normalizeRangeBoundary(value, {
        anchor: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: objectKey},
            'details',
            'body',
            {_key: blockKey},
            'children',
            {_key: secondSpanKey},
          ],
          offset: 2,
        },
      }),
    ).toEqual({
      anchor: {
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: firstSpanKey},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: secondSpanKey},
        ],
        offset: 2,
      },
    })
  })
})
