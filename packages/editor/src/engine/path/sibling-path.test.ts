import {describe, expect, test} from 'vitest'
import {siblingPath} from './sibling-path'

describe(siblingPath.name, () => {
  test('root-level sibling', () => {
    expect(siblingPath([{_key: 'b1'}], 'b2')).toEqual([{_key: 'b2'}])
  })

  test('span-level sibling inside text block', () => {
    expect(siblingPath([{_key: 'b1'}, 'children', {_key: 's1'}], 's2')).toEqual(
      [{_key: 'b1'}, 'children', {_key: 's2'}],
    )
  })

  test('line sibling inside code-block', () => {
    expect(siblingPath([{_key: 'cb'}, 'lines', {_key: 'l1'}], 'l2')).toEqual([
      {_key: 'cb'},
      'lines',
      {_key: 'l2'},
    ])
  })

  test('cell sibling inside nested table', () => {
    expect(
      siblingPath(
        [{_key: 't'}, 'rows', {_key: 'r'}, 'cells', {_key: 'c1'}],
        'c2',
      ),
    ).toEqual([{_key: 't'}, 'rows', {_key: 'r'}, 'cells', {_key: 'c2'}])
  })

  test('throws on root path', () => {
    expect(() => siblingPath([], 'x')).toThrow(
      /Cannot compute sibling path of the root path/,
    )
  })

  test('throws when last segment is not keyed', () => {
    expect(() => siblingPath([{_key: 'b'}, 'children'], 'x')).toThrow(
      /Expected last segment of sibling path to be a keyed segment/,
    )
  })

  test('throws when last segment is numeric', () => {
    expect(() => siblingPath([{_key: 'b'}, 'children', 0], 'x')).toThrow(
      /Expected last segment of sibling path to be a keyed segment/,
    )
  })
})
