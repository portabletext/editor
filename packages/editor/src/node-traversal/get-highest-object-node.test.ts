import {describe, expect, test} from 'vitest'
import {getHighestObjectNode} from './get-highest-object-node'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getHighestObjectNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [])).toBeUndefined()
  })

  test('text block returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [0])).toBeUndefined()
  })

  test('span returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [0, 0])).toBeUndefined()
  })

  test('block object at path returns itself', () => {
    const entry = getHighestObjectNode(testbed.context, [1])
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([1])
  })

  test('inline object at path returns itself', () => {
    const entry = getHighestObjectNode(testbed.context, [0, 1])
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([0, 1])
  })

  test('table at path returns itself', () => {
    const entry = getHighestObjectNode(testbed.context, [4])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('span inside cell finds table as highest object node', () => {
    const entry = getHighestObjectNode(testbed.context, [4, 0, 0, 0, 0])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('cell block finds table as highest object node', () => {
    const entry = getHighestObjectNode(testbed.context, [4, 0, 0, 0])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('cell finds table as highest object node', () => {
    const entry = getHighestObjectNode(testbed.context, [4, 0, 0])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('row finds table as highest object node', () => {
    const entry = getHighestObjectNode(testbed.context, [4, 0])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('code span finds code-block as highest object node', () => {
    const entry = getHighestObjectNode(testbed.context, [3, 0, 0])
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([3])
  })

  test('inline object in cell finds table as highest object node', () => {
    const entry = getHighestObjectNode(testbed.context, [4, 0, 0, 0, 1])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([4])
  })

  test('invalid path returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [99])).toBeUndefined()
  })
})
