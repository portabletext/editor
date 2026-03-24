import {describe, expect, test} from 'vitest'
import {getNode} from './get-node'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path', () => {
    expect(getNode(testbed.context, [])).toBeUndefined()
  })

  test('text block', () => {
    const entry = getNode(testbed.context, [0])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([0])
  })

  test('span', () => {
    const entry = getNode(testbed.context, [0, 0])
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([0, 0])
  })

  test('inline object', () => {
    const entry = getNode(testbed.context, [0, 1])
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([0, 1])
  })

  test('block object', () => {
    const entry = getNode(testbed.context, [1])
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([1])
  })

  test('second text block', () => {
    const entry = getNode(testbed.context, [2])
    expect(entry?.node).toBe(testbed.textBlock2)
    expect(entry?.path).toEqual([2])
  })

  test('out of bounds', () => {
    expect(getNode(testbed.context, [99])).toBeUndefined()
  })

  test('code block', () => {
    const entry = getNode(testbed.context, [3])
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([3])
  })

  test('code block -> first line', () => {
    const entry = getNode(testbed.context, [3, 0])
    expect(entry?.node).toBe(testbed.codeLine1)
    expect(entry?.path).toEqual([3, 0])
  })

  test('code block -> second line', () => {
    const entry = getNode(testbed.context, [3, 1])
    expect(entry?.node).toBe(testbed.codeLine2)
    expect(entry?.path).toEqual([3, 1])
  })

  test('code block -> line -> span', () => {
    const entry = getNode(testbed.context, [3, 0, 0])
    expect(entry?.node).toBe(testbed.codeSpan1)
    expect(entry?.path).toEqual([3, 0, 0])
  })

  test('table -> row', () => {
    const entry = getNode(testbed.context, [4, 0])
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([4, 0])
  })

  test('table -> row -> first cell', () => {
    const entry = getNode(testbed.context, [4, 0, 0])
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([4, 0, 0])
  })

  test('table -> row -> second cell', () => {
    const entry = getNode(testbed.context, [4, 0, 1])
    expect(entry?.node).toBe(testbed.cell2)
    expect(entry?.path).toEqual([4, 0, 1])
  })

  test('cell -> first block', () => {
    const entry = getNode(testbed.context, [4, 0, 0, 0])
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([4, 0, 0, 0])
  })

  test('cell -> second block', () => {
    const entry = getNode(testbed.context, [4, 0, 0, 1])
    expect(entry?.node).toBe(testbed.cellBlock2)
    expect(entry?.path).toEqual([4, 0, 0, 1])
  })

  test('span inside cell block', () => {
    const entry = getNode(testbed.context, [4, 0, 0, 0, 0])
    expect(entry?.node).toBe(testbed.cellSpan1)
    expect(entry?.path).toEqual([4, 0, 0, 0, 0])
  })

  test('inline object inside cell block', () => {
    const entry = getNode(testbed.context, [4, 0, 0, 0, 1])
    expect(entry?.node).toBe(testbed.stockTicker2)
    expect(entry?.path).toEqual([4, 0, 0, 0, 1])
  })

  test('second row', () => {
    const entry = getNode(testbed.context, [4, 1])
    expect(entry?.node).toBe(testbed.row2)
    expect(entry?.path).toEqual([4, 1])
  })

  test('node inside non-editable container returns undefined', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    expect(
      getNode({...testbed.context, editableTypes: tableOnly}, [3, 0]),
    ).toBeUndefined()
  })
})
