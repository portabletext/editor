import {describe, expect, test} from 'vitest'
import {getParent} from './get-parent'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getParent.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('parent of top-level block', () => {
    expect(getParent(testbed.context, [0])).toBeUndefined()
  })

  test('parent of span', () => {
    const entry = getParent(testbed.context, [0, 0])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([0])
  })

  test('parent of row', () => {
    const entry = getParent(testbed.context, [4, 0])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('parent of cell', () => {
    const entry = getParent(testbed.context, [4, 0, 0])
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([4, 0])
  })

  test('parent of block inside cell', () => {
    const entry = getParent(testbed.context, [4, 0, 0, 0])
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([4, 0, 0])
  })

  test('parent of span inside cell block', () => {
    const entry = getParent(testbed.context, [4, 0, 0, 0, 0])
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([4, 0, 0, 0])
  })

  test('parent of code line', () => {
    const entry = getParent(testbed.context, [3, 0])
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([3])
  })

  test('empty path returns undefined', () => {
    expect(getParent(testbed.context, [])).toBeUndefined()
  })
})
