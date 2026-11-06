import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {rangeSurvives} from './range-survives'
import type {Range, Step} from './step-mapper'

const spanA = [{_key: 'b1'}, 'children', {_key: 's1'}]
const spanB = [{_key: 'b1'}, 'children', {_key: 's2'}]
const spanC = [{_key: 'b2'}, 'children', {_key: 's3'}]
const base = [
  {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', marks: [], text: 'foobarbaz'},
      {_key: 's2', _type: 'span', marks: [], text: 'foo'},
    ],
    markDefs: [],
    style: 'normal',
  },
  {
    _key: 'b2',
    _type: 'block',
    children: [{_key: 's3', _type: 'span', marks: [], text: 'bar'}],
    markDefs: [],
    style: 'normal',
  },
] satisfies Array<PortableTextBlock>

describe(rangeSurvives.name, () => {
  test('two sequential removals at the same offset remove the whole original range', () => {
    expect(rangeSurvives(base, sequentialRemovals, sameSpanRange(4, 7))).toBe(
      false,
    )
  })

  test('an insertion before the range followed by its shifted removal removes the whole original range', () => {
    expect(
      rangeSurvives(
        base,
        [
          {type: 'insert.text', path: spanA, offset: 0, length: 2},
          {type: 'remove.text', path: spanA, offset: 6, length: 3},
        ],
        sameSpanRange(4, 7),
      ),
    ).toBe(false)
  })

  test('removing all but one original character preserves the range', () => {
    expect(
      rangeSurvives(
        base,
        [{type: 'remove.text', path: spanA, offset: 4, length: 2}],
        sameSpanRange(4, 7),
      ),
    ).toBe(true)
  })

  test('a same-length set preserves positional text identity', () => {
    expect(
      rangeSurvives(
        base,
        [{type: 'set.text', path: spanA, length: 9}],
        sameSpanRange(4, 7),
      ),
    ).toBe(true)
  })

  test('a batch containing both offset-shifting patterns removes both ranges', () => {
    const steps: Array<Step> = [
      ...sequentialRemovals,
      {type: 'insert.text', path: spanC, offset: 0, length: 2},
      {type: 'remove.text', path: spanC, offset: 2, length: 3},
    ]

    expect(rangeSurvives(base, steps, sameSpanRange(4, 7))).toBe(false)
    expect(
      rangeSurvives(base, steps, {
        anchor: {path: spanC, offset: 0},
        focus: {path: spanC, offset: 3},
      }),
    ).toBe(false)
  })

  test('a multi-span range survives while one original character remains', () => {
    expect(
      rangeSurvives(
        base,
        [
          {type: 'remove.text', path: spanA, offset: 8, length: 1},
          {type: 'remove.text', path: spanB, offset: 0, length: 2},
        ],
        {
          anchor: {path: spanA, offset: 8},
          focus: {path: spanB, offset: 3},
        },
      ),
    ).toBe(true)
  })

  test('a multi-block range dies when no original character remains', () => {
    expect(
      rangeSurvives(
        base,
        [
          {type: 'remove.text', path: spanB, offset: 0, length: 3},
          {type: 'remove.text', path: spanC, offset: 0, length: 3},
        ],
        {
          anchor: {path: spanB, offset: 0},
          focus: {path: spanC, offset: 3},
        },
      ),
    ).toBe(false)
  })
})

const sequentialRemovals: Array<Step> = [
  {type: 'remove.text', path: spanA, offset: 4, length: 2},
  {type: 'remove.text', path: spanA, offset: 4, length: 1},
]

function sameSpanRange(start: number, end: number): Range {
  return {
    anchor: {path: spanA, offset: start},
    focus: {path: spanA, offset: end},
  }
}
