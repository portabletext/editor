import {isTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Node} from '../slate/interfaces/node'
import {getAncestor} from './get-ancestor'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getAncestor.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getAncestor(testbed.context, [], () => true)).toBeUndefined()
  })

  test('top-level block returns undefined', () => {
    expect(getAncestor(testbed.context, [0], () => true)).toBeUndefined()
  })

  test('find text block ancestor of span', () => {
    const entry = getAncestor(testbed.context, [0, 0], (node) =>
      isTextBlock({schema: testbed.schema}, node),
    )
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([0])
  })

  test('find text block ancestor of span in cell', () => {
    const entry = getAncestor(testbed.context, [4, 0, 0, 0, 0], (node) =>
      isTextBlock({schema: testbed.schema}, node),
    )
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([4, 0, 0, 0])
  })

  test('find cell ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [4, 0, 0, 0, 0],
      (node) => node._type === 'cell',
    )
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([4, 0, 0])
  })

  test('find row ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [4, 0, 0, 0, 0],
      (node) => node._type === 'row',
    )
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([4, 0])
  })

  test('find table ancestor of span in cell', () => {
    const entry = getAncestor(
      testbed.context,
      [4, 0, 0, 0, 0],
      (node) => node._type === 'table',
    )
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('no matching ancestor returns undefined', () => {
    expect(
      getAncestor(testbed.context, [0, 0], (node) => node._type === 'table'),
    ).toBeUndefined()
  })

  test('match receives path', () => {
    const entry = getAncestor(
      testbed.context,
      [4, 0, 0, 0, 0],
      (_node: Node, path: Array<number>) => path.length === 2,
    )
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([4, 0])
  })

  test('does not check the node itself', () => {
    expect(
      getAncestor(
        testbed.context,
        [4, 0, 0, 0, 0],
        (node) => node._type === 'span',
      ),
    ).toBeUndefined()
  })

  test('find code block ancestor of code span', () => {
    const entry = getAncestor(
      testbed.context,
      [3, 0, 0],
      (node) => node._type === 'code-block',
    )
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([3])
  })

  test('returns nearest matching ancestor', () => {
    const entry = getAncestor(
      testbed.context,
      [4, 0, 0, 0, 0],
      (node) =>
        isTextBlock({schema: testbed.schema}, node) || node._type === 'table',
    )
    // Should return cellBlock1 (nearest), not table (furthest)
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([4, 0, 0, 0])
  })
})
