import {describe, expect, test} from 'vitest'
import {getFirst} from './get-first'
import {createTestbed} from './testbed'

describe(getFirst.name, () => {
  const testbed = createTestbed()

  test('first descendant from root', () => {
    expect(getFirst(testbed.root, [], testbed.schema)).toEqual([
      testbed.textBlock1,
      [0],
    ])
  })

  test('first descendant of text block', () => {
    expect(getFirst(testbed.root, [0], testbed.schema)).toEqual([
      testbed.span1,
      [0, 0],
    ])
  })

  test('first descendant of code block', () => {
    expect(getFirst(testbed.root, [3], testbed.schema)).toEqual([
      testbed.codeLine1,
      [3, 0],
    ])
  })

  test('first descendant of table', () => {
    expect(getFirst(testbed.root, [4], testbed.schema)).toEqual([
      testbed.row1,
      [4, 0],
    ])
  })

  test('leaf node returns undefined', () => {
    expect(getFirst(testbed.root, [0, 0], testbed.schema)).toBeUndefined()
  })

  test('void block object returns undefined', () => {
    expect(getFirst(testbed.root, [1], testbed.schema)).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(getFirst(testbed.root, [99], testbed.schema)).toBeUndefined()
  })
})
