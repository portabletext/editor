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

  test('container at path returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [4])).toBeUndefined()
  })

  test('span inside container returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [4, 0, 0, 0, 0]),
    ).toBeUndefined()
  })

  test('text block inside container returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [4, 0, 0, 0])).toBeUndefined()
  })

  test('cell inside container returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [4, 0, 0])).toBeUndefined()
  })

  test('row inside container returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [4, 0])).toBeUndefined()
  })

  test('code-block container returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [3, 0, 0])).toBeUndefined()
  })

  test('inline object in cell finds inline object', () => {
    const entry = getHighestObjectNode(testbed.context, [4, 0, 0, 0, 1])
    expect(entry?.node).toBe(testbed.stockTicker2)
    expect(entry?.path).toEqual([4, 0, 0, 0, 1])
  })

  test('invalid path returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [99])).toBeUndefined()
  })
})
