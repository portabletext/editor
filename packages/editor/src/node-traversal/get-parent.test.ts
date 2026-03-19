import {describe, expect, test} from 'vitest'
import {getParent} from './get-parent'
import {createTestbed} from './testbed'

describe(getParent.name, () => {
  const testbed = createTestbed()

  test('parent of top-level block', () => {
    expect(getParent(testbed.root, [0], testbed.schema)).toBeUndefined()
  })

  test('parent of span', () => {
    expect(getParent(testbed.root, [0, 0], testbed.schema)).toBe(
      testbed.textBlock1,
    )
  })

  test('parent of row', () => {
    expect(getParent(testbed.root, [4, 0], testbed.schema)).toBe(testbed.table)
  })

  test('parent of cell', () => {
    expect(getParent(testbed.root, [4, 0, 0], testbed.schema)).toBe(
      testbed.row1,
    )
  })

  test('parent of block inside cell', () => {
    expect(getParent(testbed.root, [4, 0, 0, 0], testbed.schema)).toBe(
      testbed.cell1,
    )
  })

  test('parent of span inside cell block', () => {
    expect(getParent(testbed.root, [4, 0, 0, 0, 0], testbed.schema)).toBe(
      testbed.cellBlock1,
    )
  })

  test('parent of code line', () => {
    expect(getParent(testbed.root, [3, 0], testbed.schema)).toBe(
      testbed.codeBlock,
    )
  })

  test('empty path returns undefined', () => {
    expect(getParent(testbed.root, [], testbed.schema)).toBeUndefined()
  })
})
