import {describe, expect, test} from 'vitest'
import {getChildren} from './get-children'
import {createTestbed} from './testbed'

describe(getChildren.name, () => {
  const testbed = createTestbed()

  test('root children', () => {
    expect(getChildren(testbed.root, [], testbed.schema)).toEqual([
      testbed.textBlock1,
      testbed.image,
      testbed.textBlock2,
      testbed.codeBlock,
      testbed.table,
    ])
  })

  test('text block children', () => {
    expect(getChildren(testbed.root, [0], testbed.schema)).toEqual([
      testbed.span1,
      testbed.stockTicker1,
      testbed.span2,
    ])
  })

  test('code block children (code lines)', () => {
    expect(getChildren(testbed.root, [3], testbed.schema)).toEqual([
      testbed.codeLine1,
      testbed.codeLine2,
    ])
  })

  test('code line children', () => {
    expect(getChildren(testbed.root, [3, 0], testbed.schema)).toEqual([
      testbed.codeSpan1,
    ])
  })

  test('table children (rows)', () => {
    expect(getChildren(testbed.root, [4], testbed.schema)).toEqual([
      testbed.row1,
      testbed.row2,
    ])
  })

  test('row children (cells)', () => {
    expect(getChildren(testbed.root, [4, 0], testbed.schema)).toEqual([
      testbed.cell1,
      testbed.cell2,
    ])
  })

  test('cell with multiple blocks', () => {
    expect(getChildren(testbed.root, [4, 0, 0], testbed.schema)).toEqual([
      testbed.cellBlock1,
      testbed.cellBlock2,
    ])
  })

  test('block inside cell children', () => {
    expect(getChildren(testbed.root, [4, 0, 0, 0], testbed.schema)).toEqual([
      testbed.cellSpan1,
      testbed.stockTicker2,
    ])
  })

  test('leaf node returns empty array', () => {
    expect(getChildren(testbed.root, [0, 0], testbed.schema)).toEqual([])
  })

  test('block object without children returns empty array', () => {
    expect(getChildren(testbed.root, [1], testbed.schema)).toEqual([])
  })

  test('invalid path returns empty array', () => {
    expect(getChildren(testbed.root, [99], testbed.schema)).toEqual([])
  })
})
