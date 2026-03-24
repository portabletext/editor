import {describe, expect, test} from 'vitest'
import {getLeaf} from './get-leaf'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getLeaf.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('first leaf from root (start edge)', () => {
    const entry = getLeaf(testbed.context, [], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([0, 0])
  })

  test('last leaf from root (end edge)', () => {
    const entry = getLeaf(testbed.context, [], {edge: 'end'})
    expect(entry?.node).toBe(testbed.emptySpan)
    expect(entry?.path).toEqual([4, 1, 0, 0, 0])
  })

  test('first leaf from text block', () => {
    const entry = getLeaf(testbed.context, [0], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([0, 0])
  })

  test('last leaf from text block', () => {
    const entry = getLeaf(testbed.context, [0], {edge: 'end'})
    expect(entry?.node).toBe(testbed.span2)
    expect(entry?.path).toEqual([0, 2])
  })

  test('span is already a leaf', () => {
    const entry = getLeaf(testbed.context, [0, 0], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([0, 0])
  })

  test('void block object is a leaf', () => {
    const entry = getLeaf(testbed.context, [1], {edge: 'start'})
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([1])
  })

  test('inline object is a leaf', () => {
    const entry = getLeaf(testbed.context, [0, 1], {edge: 'start'})
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([0, 1])
  })

  test('empty document returns undefined', () => {
    const emptyContext = {
      ...testbed.context,
      value: [],
    }
    expect(getLeaf(emptyContext, [], {edge: 'start'})).toBeUndefined()
    expect(getLeaf(emptyContext, [], {edge: 'end'})).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(getLeaf(testbed.context, [99], {edge: 'start'})).toBeUndefined()
    expect(getLeaf(testbed.context, [0, 99], {edge: 'end'})).toBeUndefined()
  })

  test('first leaf from code block', () => {
    const entry = getLeaf(testbed.context, [3], {edge: 'start'})
    expect(entry?.node).toBe(testbed.codeSpan1)
    expect(entry?.path).toEqual([3, 0, 0])
  })

  test('last leaf from code block', () => {
    const entry = getLeaf(testbed.context, [3], {edge: 'end'})
    expect(entry?.node).toBe(testbed.codeSpan2)
    expect(entry?.path).toEqual([3, 1, 0])
  })

  test('first leaf from table', () => {
    const entry = getLeaf(testbed.context, [4], {edge: 'start'})
    expect(entry?.node).toBe(testbed.cellSpan1)
    expect(entry?.path).toEqual([4, 0, 0, 0, 0])
  })

  test('last leaf from table', () => {
    const entry = getLeaf(testbed.context, [4], {edge: 'end'})
    expect(entry?.node).toBe(testbed.emptySpan)
    expect(entry?.path).toEqual([4, 1, 0, 0, 0])
  })
})
