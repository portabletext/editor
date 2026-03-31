import {describe, expect, test} from 'vitest'
import {getLastChild} from './get-last-child'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getLastChild.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('last descendant from root', () => {
    expect(getLastChild(testbed.context, [])).toEqual({
      node: testbed.table,
      path: [4],
    })
  })

  test('last descendant of text block', () => {
    expect(getLastChild(testbed.context, [0])).toEqual({
      node: testbed.span2,
      path: [0, 2],
    })
  })

  test('last descendant of code block', () => {
    expect(getLastChild(testbed.context, [3])).toEqual({
      node: testbed.codeLine2,
      path: [3, 1],
    })
  })

  test('last descendant of table', () => {
    expect(getLastChild(testbed.context, [4])).toEqual({
      node: testbed.row2,
      path: [4, 1],
    })
  })

  test('leaf node returns undefined', () => {
    expect(getLastChild(testbed.context, [0, 0])).toBeUndefined()
  })

  test('void block object returns undefined', () => {
    expect(getLastChild(testbed.context, [1])).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(getLastChild(testbed.context, [99])).toBeUndefined()
  })

  test('last of non-editable container returns undefined', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    expect(
      getLastChild({...testbed.context, editableTypes: tableOnly}, [3]),
    ).toBeUndefined()
  })
})
