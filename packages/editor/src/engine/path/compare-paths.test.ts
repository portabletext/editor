import {describe, expect, test} from 'vitest'
import type {Node} from '../interfaces/node'
import {comparePaths} from './compare-paths'

const emptyRoot = {value: [] as Array<Node>}

describe(comparePaths.name, () => {
  test('equal keyed paths return 0', () => {
    expect(
      comparePaths(
        [{_key: 'b1'}, 'children', {_key: 's1'}],
        [{_key: 'b1'}, 'children', {_key: 's1'}],
        emptyRoot,
      ),
    ).toEqual(0)
  })

  test('equal numeric paths return 0', () => {
    expect(comparePaths([0, 1], [0, 1], emptyRoot)).toEqual(0)
  })

  test('prefix paths return 0', () => {
    expect(
      comparePaths(
        [{_key: 'b1'}],
        [{_key: 'b1'}, 'children', {_key: 's1'}],
        emptyRoot,
      ),
    ).toEqual(0)
    expect(
      comparePaths(
        [{_key: 'b1'}, 'children', {_key: 's1'}],
        [{_key: 'b1'}],
        emptyRoot,
      ),
    ).toEqual(0)
  })

  test('numeric ordering', () => {
    expect(comparePaths([0], [1], emptyRoot)).toEqual(-1)
    expect(comparePaths([1], [0], emptyRoot)).toEqual(1)
  })

  test('string ordering', () => {
    expect(
      comparePaths(
        [{_key: 'b1'}, 'children'],
        [{_key: 'b1'}, 'markDefs'],
        emptyRoot,
      ),
    ).toEqual(-1)
  })

  test('keyed ordering with root', () => {
    const children: Array<Node> = [
      {_key: 'b1', _type: 'block', children: []},
      {_key: 'b2', _type: 'block', children: []},
    ]
    expect(
      comparePaths([{_key: 'b1'}], [{_key: 'b2'}], {value: children}),
    ).toEqual(-1)
  })

  test('keyed ordering falls back to string comparison when keys are not in root', () => {
    expect(comparePaths([{_key: 'a1'}], [{_key: 'b1'}], emptyRoot)).toEqual(-1)
  })

  test('keyed ordering with root resolves out-of-order keys', () => {
    const children: Array<Node> = [
      {_key: 'z', _type: 'block', children: []},
      {_key: 'a', _type: 'block', children: []},
    ]
    expect(comparePaths([{_key: 'a'}], [{_key: 'z'}], emptyRoot)).toEqual(-1)
    expect(
      comparePaths([{_key: 'z'}], [{_key: 'a'}], {value: children}),
    ).toEqual(-1)
  })
})
