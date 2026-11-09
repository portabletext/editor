import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {interpretTransaction} from './interpret-transaction'
import {mapRangeInward} from './map-range-inward'
import {mapRange} from './step-mapper'

const block = (key: string, spans: Array<[key: string, text: string]>) =>
  ({
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: spans.map(([spanKey, text]) => ({
      _type: 'span',
      _key: spanKey,
      text,
      marks: [],
    })),
  }) satisfies PortableTextBlock

const at = (blockKey: string, spanKey: string, offset: number) => ({
  path: [{_key: blockKey}, 'children', {_key: spanKey}],
  offset,
})

describe(mapRangeInward.name, () => {
  test('a range starting in a deleted span shrinks to its surviving text in the next span', () => {
    const base = [
      block('b0', [
        ['s1', 'abc'],
        ['s2', 'def'],
      ]),
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
        origin: 'local',
      },
    ])
    // "bcde": the "bc" goes with s1, "de" survives in s2.
    const range = {anchor: at('b0', 's1', 1), focus: at('b0', 's2', 2)}

    expect(mapRange(steps, range)).toBeNull()
    expect(mapRangeInward(base, steps, range)).toEqual({
      anchor: at('b0', 's2', 0),
      focus: at('b0', 's2', 2),
    })
  })

  test('a range ending in a deleted span shrinks to its surviving text in the previous span', () => {
    const base = [
      block('b0', [
        ['s1', 'abc'],
        ['s2', 'def'],
      ]),
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 's2'}],
        origin: 'local',
      },
    ])
    // "bcde": "bc" survives in s1.
    const range = {anchor: at('b0', 's1', 1), focus: at('b0', 's2', 2)}

    expect(mapRangeInward(base, steps, range)).toEqual({
      anchor: at('b0', 's1', 1),
      focus: at('b0', 's1', 3),
    })
  })

  test('a range that starts at the end of a block follows its own text when that block moves away', () => {
    const base = [block('b0', [['s0', 'abc']]), block('b1', [['s1', 'def']])]
    const moved = base[1]!
    const steps = interpretTransaction(base, [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'before',
        items: [moved],
        origin: 'local',
      },
    ])
    // "de", with its start written as the end of b0 (the same text position).
    const range = {anchor: at('b0', 's0', 3), focus: at('b1', 's1', 2)}

    expect(mapRangeInward(base, steps, range)).toEqual({
      anchor: at('b1', 's1', 0),
      focus: at('b1', 's1', 2),
    })
  })

  test('a backward range keeps its direction', () => {
    const base = [
      block('b0', [
        ['s1', 'abc'],
        ['s2', 'def'],
      ]),
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
        origin: 'local',
      },
    ])
    const range = {anchor: at('b0', 's2', 2), focus: at('b0', 's1', 1)}

    expect(mapRangeInward(base, steps, range)).toEqual({
      anchor: at('b0', 's2', 2),
      focus: at('b0', 's2', 0),
    })
  })

  test('a range dies only when every character it covers is removed', () => {
    const base = [
      block('b0', [
        ['s1', 'abc'],
        ['s2', 'def'],
      ]),
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
        origin: 'local',
      },
    ])

    expect(
      mapRangeInward(base, steps, {
        anchor: at('b0', 's1', 0),
        focus: at('b0', 's1', 3),
      }),
    ).toBeNull()
  })
})

describe(`${mapRangeInward.name} with the value after the steps`, () => {
  test('when the block holding the end of "c\\nde" moves above the block holding its start, the range spans "de\\nabc"', () => {
    const base = [block('b0', [['s0', 'abc']]), block('b1', [['s1', 'def']])]
    const moved = base[1]!
    const patches = [
      {type: 'unset' as const, path: [{_key: 'b1'}], origin: 'local' as const},
      {
        type: 'insert' as const,
        path: [{_key: 'b0'}],
        position: 'before' as const,
        items: [moved],
        origin: 'local' as const,
      },
    ]
    const steps = interpretTransaction(base, patches)
    const after = [base[1]!, base[0]!]
    const range = {anchor: at('b0', 's0', 2), focus: at('b1', 's1', 2)}

    expect(mapRangeInward(base, steps, range)).toEqual({
      anchor: at('b0', 's0', 2),
      focus: at('b1', 's1', 2),
    })
    expect(mapRangeInward(base, steps, range, {after})).toEqual({
      anchor: at('b1', 's1', 0),
      focus: at('b0', 's0', 3),
    })
  })

  test('a block moved between the edges of "c\\nde" without swapping them leaves the edges alone', () => {
    const base = [
      block('b0', [['s0', 'abc']]),
      block('b1', [['s1', 'def']]),
      block('b2', [['s2', 'ghi']]),
    ]
    const steps = interpretTransaction(base, [
      {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'after',
        items: [base[2]!],
        origin: 'local',
      },
    ])
    const after = [base[0]!, base[2]!, base[1]!]
    const range = {anchor: at('b0', 's0', 2), focus: at('b1', 's1', 2)}

    expect(mapRangeInward(base, steps, range, {after})).toEqual({
      anchor: at('b0', 's0', 2),
      focus: at('b1', 's1', 2),
    })
  })
})
