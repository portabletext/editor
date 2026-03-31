import {describe, expect, test} from 'vitest'
import {getFirstChild} from './get-first-child'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getFirstChild.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('first descendant from root', () => {
    expect(getFirstChild(testbed.context, [])).toEqual({
      node: testbed.textBlock1,
      path: [0],
    })
  })

  test('first descendant of text block', () => {
    expect(getFirstChild(testbed.context, [0])).toEqual({
      node: testbed.span1,
      path: [0, 0],
    })
  })

  test('first descendant of code block', () => {
    expect(getFirstChild(testbed.context, [3])).toEqual({
      node: testbed.codeLine1,
      path: [3, 0],
    })
  })

  test('first descendant of table', () => {
    expect(getFirstChild(testbed.context, [4])).toEqual({
      node: testbed.row1,
      path: [4, 0],
    })
  })

  test('leaf node returns undefined', () => {
    expect(getFirstChild(testbed.context, [0, 0])).toBeUndefined()
  })

  test('void block object returns undefined', () => {
    expect(getFirstChild(testbed.context, [1])).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(getFirstChild(testbed.context, [99])).toBeUndefined()
  })

  test('first of non-editable container returns undefined', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    expect(
      getFirstChild({...testbed.context, editableTypes: tableOnly}, [3]),
    ).toBeUndefined()
  })
})
