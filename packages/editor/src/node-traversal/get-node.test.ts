import {describe, expect, test} from 'vitest'
import {getNode} from './get-node'
import {createTestbed} from './testbed'

describe(getNode.name, () => {
  const testbed = createTestbed()

  test('empty path', () => {
    expect(getNode(testbed.root, [], testbed.schema)).toBeUndefined()
  })

  test('text block', () => {
    expect(getNode(testbed.root, [0], testbed.schema)).toBe(testbed.textBlock1)
  })

  test('span', () => {
    expect(getNode(testbed.root, [0, 0], testbed.schema)).toBe(testbed.span1)
  })

  test('inline object', () => {
    expect(getNode(testbed.root, [0, 1], testbed.schema)).toBe(
      testbed.stockTicker1,
    )
  })

  test('block object', () => {
    expect(getNode(testbed.root, [1], testbed.schema)).toBe(testbed.image)
  })

  test('second text block', () => {
    expect(getNode(testbed.root, [2], testbed.schema)).toBe(testbed.textBlock2)
  })

  test('out of bounds', () => {
    expect(getNode(testbed.root, [99], testbed.schema)).toBeUndefined()
  })

  test('code block', () => {
    expect(getNode(testbed.root, [3], testbed.schema)).toBe(testbed.codeBlock)
  })

  test('code block -> first line', () => {
    expect(getNode(testbed.root, [3, 0], testbed.schema)).toBe(
      testbed.codeLine1,
    )
  })

  test('code block -> second line', () => {
    expect(getNode(testbed.root, [3, 1], testbed.schema)).toBe(
      testbed.codeLine2,
    )
  })

  test('code block -> line -> span', () => {
    expect(getNode(testbed.root, [3, 0, 0], testbed.schema)).toBe(
      testbed.codeSpan1,
    )
  })

  test('table -> row', () => {
    expect(getNode(testbed.root, [4, 0], testbed.schema)).toBe(testbed.row1)
  })

  test('table -> row -> first cell', () => {
    expect(getNode(testbed.root, [4, 0, 0], testbed.schema)).toBe(testbed.cell1)
  })

  test('table -> row -> second cell', () => {
    expect(getNode(testbed.root, [4, 0, 1], testbed.schema)).toBe(testbed.cell2)
  })

  test('cell -> first block', () => {
    expect(getNode(testbed.root, [4, 0, 0, 0], testbed.schema)).toBe(
      testbed.cellBlock1,
    )
  })

  test('cell -> second block', () => {
    expect(getNode(testbed.root, [4, 0, 0, 1], testbed.schema)).toBe(
      testbed.cellBlock2,
    )
  })

  test('span inside cell block', () => {
    expect(getNode(testbed.root, [4, 0, 0, 0, 0], testbed.schema)).toBe(
      testbed.cellSpan1,
    )
  })

  test('inline object inside cell block', () => {
    expect(getNode(testbed.root, [4, 0, 0, 0, 1], testbed.schema)).toBe(
      testbed.stockTicker2,
    )
  })

  test('second row', () => {
    expect(getNode(testbed.root, [4, 1], testbed.schema)).toBe(testbed.row2)
  })
})
