import {describe, expect, test} from 'vitest'
import {parentPath} from './parent-path'

describe(parentPath.name, () => {
  test('block path', () => {
    expect(parentPath([{_key: 'b1'}])).toEqual([])
  })

  test('span path', () => {
    expect(parentPath([{_key: 'b1'}, 'children', {_key: 's1'}])).toEqual([
      {_key: 'b1'},
    ])
  })

  test('numeric child', () => {
    expect(parentPath([{_key: 'b1'}, 'children', 0])).toEqual([{_key: 'b1'}])
  })

  test('deep container path', () => {
    expect(
      parentPath([{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}]),
    ).toEqual([{_key: 't1'}, 'rows', {_key: 'r1'}])
  })

  test('throws on empty path', () => {
    expect(() => parentPath([])).toThrow()
  })
})
