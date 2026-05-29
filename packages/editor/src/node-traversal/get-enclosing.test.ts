import {isTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {getEnclosing} from './get-enclosing'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getEnclosing.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getEnclosing(testbed.snapshot, [], () => true)).toBeUndefined()
  })

  test('top-level block is returned when it matches', () => {
    const entry = getEnclosing(testbed.snapshot, [{_key: 'k3'}], (node) =>
      isTextBlock({schema: testbed.schema}, node),
    )
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('node at path is returned when it matches', () => {
    const entry = getEnclosing(
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}],
      (node) => node._type === 'row',
    )
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('walks up to find row from cell path', () => {
    const entry = getEnclosing(
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      (node) => node._type === 'row',
    )
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('walks up to find row from span path deep inside cell', () => {
    const entry = getEnclosing(
      testbed.snapshot,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      (node) => node._type === 'row',
    )
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('returns nearest match (self over ancestors)', () => {
    const entry = getEnclosing(
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      (node) => node._type === 'cell' || node._type === 'table',
    )
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
  })

  test('no matching node returns undefined', () => {
    expect(
      getEnclosing(
        testbed.snapshot,
        [{_key: 'k26'}, 'rows', {_key: 'k21'}],
        (node) => node._type === 'nonexistent',
      ),
    ).toBeUndefined()
  })

  test('match receives path', () => {
    const paths: Array<unknown> = []
    getEnclosing(
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      (_, path) => {
        paths.push(path)
        return false
      },
    )
    expect(paths.length).toBeGreaterThan(0)
  })

  test('narrows the return type when given a type predicate', () => {
    const entry = getEnclosing(
      testbed.snapshot,
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      (node): node is typeof testbed.textBlock1 =>
        isTextBlock({schema: testbed.schema}, node),
    )
    // Type-narrowed access: TS sees `entry.node` as textBlock1's type
    expect(entry?.node.children).toEqual(testbed.textBlock1.children)
  })
})
