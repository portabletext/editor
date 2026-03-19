import {describe, expect, test} from 'vitest'
import {getLast} from './get-last'
import {createTestbed} from './testbed'

describe(getLast.name, () => {
  const testbed = createTestbed()

  test('last descendant from root', () => {
    expect(getLast(testbed.root, [], testbed.schema)).toEqual([
      testbed.table,
      [4],
    ])
  })

  test('last descendant of text block', () => {
    expect(getLast(testbed.root, [0], testbed.schema)).toEqual([
      testbed.span2,
      [0, 2],
    ])
  })

  test('last descendant of code block', () => {
    expect(getLast(testbed.root, [3], testbed.schema)).toEqual([
      testbed.codeLine2,
      [3, 1],
    ])
  })

  test('last descendant of table', () => {
    expect(getLast(testbed.root, [4], testbed.schema)).toEqual([
      testbed.row2,
      [4, 1],
    ])
  })

  test('leaf node returns undefined', () => {
    expect(getLast(testbed.root, [0, 0], testbed.schema)).toBeUndefined()
  })

  test('void block object returns undefined', () => {
    expect(getLast(testbed.root, [1], testbed.schema)).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(getLast(testbed.root, [99], testbed.schema)).toBeUndefined()
  })
})
