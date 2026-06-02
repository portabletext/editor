import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {rangesOverlap} from './ranges-overlap'

const value: Array<PortableTextBlock> = [
  {
    _type: 'block',
    _key: 'k0',
    children: [
      {_type: 'span', _key: 's0', text: 'foo'},
      {_type: 'span', _key: 's1', text: 'bar'},
    ],
  },
  {
    _type: 'block',
    _key: 'k1',
    children: [{_type: 'span', _key: 's2', text: 'baz'}],
  },
]

const root = {value}

describe(rangesOverlap.name, () => {
  test('disjoint ranges in same span', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
        },
        root,
      ),
    ).toBe(false)
  })

  test('disjoint ranges across blocks', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
        },
        {
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 's2'}], offset: 0},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 's2'}], offset: 1},
        },
        root,
      ),
    ).toBe(false)
  })

  test('touching at one endpoint', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
        },
        root,
      ),
    ).toBe(true)
  })

  test('partial overlap', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
        },
        root,
      ),
    ).toBe(true)
  })

  test('full containment', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
        },
        root,
      ),
    ).toBe(true)
  })

  test('identical ranges', () => {
    const range = {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
    }
    expect(rangesOverlap(range, range, root)).toBe(true)
  })

  test('two collapsed ranges at the same point', () => {
    const point = {
      path: [{_key: 'k0'}, 'children', {_key: 's0'}],
      offset: 1,
    }
    expect(
      rangesOverlap(
        {anchor: point, focus: point},
        {anchor: point, focus: point},
        root,
      ),
    ).toBe(true)
  })

  test('two collapsed ranges at different points', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
        },
        root,
      ),
    ).toBe(false)
  })

  test('collapsed range inside expanded range', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
        },
        root,
      ),
    ).toBe(true)
  })

  test('backward range overlapping forward range', () => {
    expect(
      rangesOverlap(
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 2},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 0},
        },
        {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 1},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 's0'}], offset: 3},
        },
        root,
      ),
    ).toBe(true)
  })
})
