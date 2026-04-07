import {describe, expect, test} from 'vitest'
import type {Node} from '../interfaces/node'
import {comparePaths} from './compare-paths'

describe(comparePaths.name, () => {
  test('equal keyed paths return 0', () => {
    expect(
      comparePaths(
        [{_key: 'b1'}, 'children', {_key: 's1'}],
        [{_key: 'b1'}, 'children', {_key: 's1'}],
      ),
    ).toEqual(0)
  })

  test('equal numeric paths return 0', () => {
    expect(comparePaths([0, 1], [0, 1])).toEqual(0)
  })

  test('prefix paths return 0', () => {
    expect(
      comparePaths([{_key: 'b1'}], [{_key: 'b1'}, 'children', {_key: 's1'}]),
    ).toEqual(0)
    expect(
      comparePaths([{_key: 'b1'}, 'children', {_key: 's1'}], [{_key: 'b1'}]),
    ).toEqual(0)
  })

  test('numeric ordering', () => {
    expect(comparePaths([0], [1])).toEqual(-1)
    expect(comparePaths([1], [0])).toEqual(1)
  })

  test('string ordering', () => {
    expect(
      comparePaths([{_key: 'b1'}, 'children'], [{_key: 'b1'}, 'markDefs']),
    ).toEqual(-1)
  })

  test('keyed ordering with root', () => {
    const children: Array<Node> = [
      {_key: 'b1', _type: 'block', children: []},
      {_key: 'b2', _type: 'block', children: []},
    ]
    expect(comparePaths([{_key: 'b1'}], [{_key: 'b2'}], {children})).toEqual(-1)
  })

  test('keyed ordering without root falls back to string comparison', () => {
    expect(comparePaths([{_key: 'a1'}], [{_key: 'b1'}])).toEqual(-1)
  })

  test('keyed ordering with root resolves out-of-order keys', () => {
    const children: Array<Node> = [
      {_key: 'z', _type: 'block', children: []},
      {_key: 'a', _type: 'block', children: []},
    ]
    expect(comparePaths([{_key: 'a'}], [{_key: 'z'}])).toEqual(-1)
    expect(comparePaths([{_key: 'z'}], [{_key: 'a'}], {children})).toEqual(-1)
  })
})
