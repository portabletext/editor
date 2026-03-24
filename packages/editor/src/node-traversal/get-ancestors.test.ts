import {describe, expect, test} from 'vitest'
import {getAncestors} from './get-ancestors'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getAncestors.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns empty array', () => {
    expect(getAncestors(testbed.context, [])).toEqual([])
  })

  test('top-level block has no ancestors', () => {
    expect(getAncestors(testbed.context, [0])).toEqual([])
  })

  test('span in text block has one ancestor', () => {
    const ancestors = getAncestors(testbed.context, [0, 1])
    expect(ancestors).toHaveLength(1)
    expect(ancestors.at(0)?.node).toBe(testbed.textBlock1)
    expect(ancestors.at(0)?.path).toEqual([0])
  })

  test('span in cell block has four ancestors', () => {
    const ancestors = getAncestors(testbed.context, [4, 0, 0, 0, 0])
    expect(ancestors).toHaveLength(4)
    expect(ancestors.at(0)?.node).toBe(testbed.cellBlock1)
    expect(ancestors.at(0)?.path).toEqual([4, 0, 0, 0])
    expect(ancestors.at(1)?.node).toBe(testbed.cell1)
    expect(ancestors.at(1)?.path).toEqual([4, 0, 0])
    expect(ancestors.at(2)?.node).toBe(testbed.row1)
    expect(ancestors.at(2)?.path).toEqual([4, 0])
    expect(ancestors.at(3)?.node).toBe(testbed.table)
    expect(ancestors.at(3)?.path).toEqual([4])
  })

  test('block in cell has three ancestors', () => {
    const ancestors = getAncestors(testbed.context, [4, 0, 0, 0])
    expect(ancestors).toHaveLength(3)
    expect(ancestors.at(0)?.node).toBe(testbed.cell1)
    expect(ancestors.at(0)?.path).toEqual([4, 0, 0])
    expect(ancestors.at(1)?.node).toBe(testbed.row1)
    expect(ancestors.at(1)?.path).toEqual([4, 0])
    expect(ancestors.at(2)?.node).toBe(testbed.table)
    expect(ancestors.at(2)?.path).toEqual([4])
  })

  test('cell has two ancestors', () => {
    const ancestors = getAncestors(testbed.context, [4, 0, 0])
    expect(ancestors).toHaveLength(2)
    expect(ancestors.at(0)?.node).toBe(testbed.row1)
    expect(ancestors.at(0)?.path).toEqual([4, 0])
    expect(ancestors.at(1)?.node).toBe(testbed.table)
    expect(ancestors.at(1)?.path).toEqual([4])
  })

  test('row has one ancestor', () => {
    const ancestors = getAncestors(testbed.context, [4, 0])
    expect(ancestors).toHaveLength(1)
    expect(ancestors.at(0)?.node).toBe(testbed.table)
    expect(ancestors.at(0)?.path).toEqual([4])
  })

  test('code span has two ancestors', () => {
    const ancestors = getAncestors(testbed.context, [3, 0, 0])
    expect(ancestors).toHaveLength(2)
    expect(ancestors.at(0)?.node).toBe(testbed.codeLine1)
    expect(ancestors.at(0)?.path).toEqual([3, 0])
    expect(ancestors.at(1)?.node).toBe(testbed.codeBlock)
    expect(ancestors.at(1)?.path).toEqual([3])
  })

  test('code line has one ancestor', () => {
    const ancestors = getAncestors(testbed.context, [3, 0])
    expect(ancestors).toHaveLength(1)
    expect(ancestors.at(0)?.node).toBe(testbed.codeBlock)
    expect(ancestors.at(0)?.path).toEqual([3])
  })

  test('ancestors are ordered from nearest to furthest', () => {
    const ancestors = getAncestors(testbed.context, [4, 0, 0, 0, 0])
    const paths = ancestors.map((ancestor) => ancestor.path)
    expect(paths).toEqual([[4, 0, 0, 0], [4, 0, 0], [4, 0], [4]])
  })
})
