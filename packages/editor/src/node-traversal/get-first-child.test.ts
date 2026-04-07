import {describe, expect, test} from 'vitest'
import {getFirstChild} from './get-first-child'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getFirstChild.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('first descendant from root', () => {
    expect(getFirstChild(testbed.context, [])).toEqual({
      node: testbed.textBlock1,
      path: [{_key: 'k3'}],
    })
  })

  test('first descendant of text block', () => {
    expect(getFirstChild(testbed.context, [{_key: 'k3'}])).toEqual({
      node: testbed.span1,
      path: [{_key: 'k3'}, 'children', {_key: 'k0'}],
    })
  })

  test('first descendant of code block', () => {
    expect(getFirstChild(testbed.context, [{_key: 'k11'}])).toEqual({
      node: testbed.codeLine1,
      path: [{_key: 'k11'}, 'code', {_key: 'k8'}],
    })
  })

  test('first descendant of table', () => {
    expect(getFirstChild(testbed.context, [{_key: 'k26'}])).toEqual({
      node: testbed.row1,
      path: [{_key: 'k26'}, 'rows', {_key: 'k21'}],
    })
  })

  test('leaf node returns undefined', () => {
    expect(
      getFirstChild(testbed.context, [{_key: 'k3'}, 'children', {_key: 'k0'}]),
    ).toBeUndefined()
  })

  test('void block object returns undefined', () => {
    expect(getFirstChild(testbed.context, [{_key: 'k4'}])).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(
      getFirstChild(testbed.context, [{_key: 'nonexistent'}]),
    ).toBeUndefined()
  })

  test('first of non-editable container returns undefined', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    expect(
      getFirstChild({...testbed.context, editableTypes: tableOnly}, [
        {_key: 'k11'},
      ]),
    ).toBeUndefined()
  })
})
