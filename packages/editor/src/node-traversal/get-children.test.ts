import {describe, expect, test} from 'vitest'
import {getChildren} from './get-children'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getChildren.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('root children', () => {
    expect(getChildren(testbed.context, [])).toEqual([
      {node: testbed.textBlock1, path: [0]},
      {node: testbed.image, path: [1]},
      {node: testbed.textBlock2, path: [2]},
      {node: testbed.codeBlock, path: [3]},
      {node: testbed.table, path: [4]},
    ])
  })

  test('text block children', () => {
    expect(getChildren(testbed.context, [0])).toEqual([
      {node: testbed.span1, path: [0, 0]},
      {node: testbed.stockTicker1, path: [0, 1]},
      {node: testbed.span2, path: [0, 2]},
    ])
  })

  test('code block children (code lines)', () => {
    expect(getChildren(testbed.context, [3])).toEqual([
      {node: testbed.codeLine1, path: [3, 0]},
      {node: testbed.codeLine2, path: [3, 1]},
    ])
  })

  test('code line children', () => {
    expect(getChildren(testbed.context, [3, 0])).toEqual([
      {node: testbed.codeSpan1, path: [3, 0, 0]},
    ])
  })

  test('table children (rows)', () => {
    expect(getChildren(testbed.context, [4])).toEqual([
      {node: testbed.row1, path: [4, 0]},
      {node: testbed.row2, path: [4, 1]},
    ])
  })

  test('row children (cells)', () => {
    expect(getChildren(testbed.context, [4, 0])).toEqual([
      {node: testbed.cell1, path: [4, 0, 0]},
      {node: testbed.cell2, path: [4, 0, 1]},
    ])
  })

  test('cell with multiple blocks', () => {
    expect(getChildren(testbed.context, [4, 0, 0])).toEqual([
      {node: testbed.cellBlock1, path: [4, 0, 0, 0]},
      {node: testbed.cellBlock2, path: [4, 0, 0, 1]},
    ])
  })

  test('block inside cell children', () => {
    expect(getChildren(testbed.context, [4, 0, 0, 0])).toEqual([
      {node: testbed.cellSpan1, path: [4, 0, 0, 0, 0]},
      {node: testbed.stockTicker2, path: [4, 0, 0, 0, 1]},
    ])
  })

  test('leaf node returns empty array', () => {
    expect(getChildren(testbed.context, [0, 0])).toEqual([])
  })

  test('block object without children returns empty array', () => {
    expect(getChildren(testbed.context, [1])).toEqual([])
  })

  test('invalid path returns empty array', () => {
    expect(getChildren(testbed.context, [99])).toEqual([])
  })

  test('non-editable code block returns empty array', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    expect(
      getChildren({...testbed.context, editableTypes: tableOnly}, [3]),
    ).toEqual([])
  })

  test('non-editable table returns empty array', () => {
    const codeOnly = new Set(['code-block'])
    expect(
      getChildren({...testbed.context, editableTypes: codeOnly}, [4]),
    ).toEqual([])
  })
})
