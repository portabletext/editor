import {describe, expect, test} from 'vitest'
import {getSibling} from './get-sibling'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getSibling.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getSibling(testbed.context, [], 'next')).toBeUndefined()
    expect(getSibling(testbed.context, [], 'previous')).toBeUndefined()
  })

  test('next sibling of first top-level block', () => {
    const entry = getSibling(testbed.context, [0], 'next')
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([1])
  })

  test('previous sibling of second top-level block', () => {
    const entry = getSibling(testbed.context, [1], 'previous')
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([0])
  })

  test('next sibling of last top-level block returns undefined', () => {
    expect(getSibling(testbed.context, [4], 'next')).toBeUndefined()
  })

  test('previous sibling of first top-level block returns undefined', () => {
    expect(getSibling(testbed.context, [0], 'previous')).toBeUndefined()
  })

  test('next sibling of span in text block', () => {
    const entry = getSibling(testbed.context, [0, 0], 'next')
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([0, 1])
  })

  test('previous sibling of last span in text block', () => {
    const entry = getSibling(testbed.context, [0, 2], 'previous')
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([0, 1])
  })

  test('next sibling of last span in text block returns undefined', () => {
    expect(getSibling(testbed.context, [0, 2], 'next')).toBeUndefined()
  })

  test('previous sibling of first span in text block returns undefined', () => {
    expect(getSibling(testbed.context, [0, 0], 'previous')).toBeUndefined()
  })

  test('next sibling of first block in cell', () => {
    const entry = getSibling(testbed.context, [4, 0, 0, 0], 'next')
    expect(entry?.node).toBe(testbed.cellBlock2)
    expect(entry?.path).toEqual([4, 0, 0, 1])
  })

  test('previous sibling of second block in cell', () => {
    const entry = getSibling(testbed.context, [4, 0, 0, 1], 'previous')
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([4, 0, 0, 0])
  })

  test('next sibling of last block in cell returns undefined', () => {
    expect(getSibling(testbed.context, [4, 0, 0, 1], 'next')).toBeUndefined()
  })

  test('next sibling of first cell in row', () => {
    const entry = getSibling(testbed.context, [4, 0, 0], 'next')
    expect(entry?.node).toBe(testbed.cell2)
    expect(entry?.path).toEqual([4, 0, 1])
  })

  test('previous sibling of second cell in row', () => {
    const entry = getSibling(testbed.context, [4, 0, 1], 'previous')
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([4, 0, 0])
  })

  test('next sibling of first row in table', () => {
    const entry = getSibling(testbed.context, [4, 0], 'next')
    expect(entry?.node).toBe(testbed.row2)
    expect(entry?.path).toEqual([4, 1])
  })

  test('previous sibling of second row in table', () => {
    const entry = getSibling(testbed.context, [4, 1], 'previous')
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([4, 0])
  })

  test('next sibling of span inside cell block', () => {
    const entry = getSibling(testbed.context, [4, 0, 0, 0, 0], 'next')
    expect(entry?.node).toBe(testbed.stockTicker2)
    expect(entry?.path).toEqual([4, 0, 0, 0, 1])
  })

  test('previous sibling of inline object inside cell block', () => {
    const entry = getSibling(testbed.context, [4, 0, 0, 0, 1], 'previous')
    expect(entry?.node).toBe(testbed.cellSpan1)
    expect(entry?.path).toEqual([4, 0, 0, 0, 0])
  })

  test('out of bounds path returns undefined', () => {
    expect(getSibling(testbed.context, [99], 'next')).toBeUndefined()
    expect(getSibling(testbed.context, [99], 'previous')).toBeUndefined()
  })

  test('next sibling of code line', () => {
    const entry = getSibling(testbed.context, [3, 0], 'next')
    expect(entry?.node).toBe(testbed.codeLine2)
    expect(entry?.path).toEqual([3, 1])
  })

  test('previous sibling of second code line', () => {
    const entry = getSibling(testbed.context, [3, 1], 'previous')
    expect(entry?.node).toBe(testbed.codeLine1)
    expect(entry?.path).toEqual([3, 0])
  })
})
