import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {getFocusBlockObject} from './get-focus-block-object'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getFocusBlockObject.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('returns undefined when there is no selection', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: null,
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual(undefined)
  })

  test('returns undefined when the focus is inside a text block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: {
          anchor: {
            path: [
              {_key: testbed.textBlock1._key},
              'children',
              {_key: testbed.span1._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: testbed.textBlock1._key},
              'children',
              {_key: testbed.span1._key},
            ],
            offset: 0,
          },
          backward: false,
        },
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual(undefined)
  })

  test('returns the focused void block object at root', () => {
    const path = [{_key: testbed.image._key}]
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
          backward: false,
        },
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual({
      node: testbed.image,
      path,
    })
  })

  test('returns undefined when focus is on a void inline object', () => {
    const path = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.stockTicker1._key},
    ]
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
          backward: false,
        },
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual(undefined)
  })

  test('returns undefined when focus is inside an editable container line', () => {
    const path = [
      {_key: testbed.codeBlock._key},
      'code',
      {_key: testbed.codeLine1._key},
      'children',
      {_key: testbed.codeSpan1._key},
    ]
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
          backward: false,
        },
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual(undefined)
  })

  test('returns undefined when focus is inside a table cell text block', () => {
    const path = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell1._key},
      'content',
      {_key: testbed.cellBlock1._key},
      'children',
      {_key: testbed.cellSpan1._key},
    ]
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
          backward: false,
        },
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual(undefined)
  })

  test('returns undefined when focus is on a void inline object inside a table cell', () => {
    const path = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell1._key},
      'content',
      {_key: testbed.cellBlock1._key},
      'children',
      {_key: testbed.stockTicker2._key},
    ]
    const snapshot = createTestSnapshot({
      context: {
        schema: testbed.schema,
        containers: testbed.context.containers,
        value: testbed.context.value,
        selection: {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
          backward: false,
        },
      },
    })
    expect(getFocusBlockObject(snapshot)).toEqual(undefined)
  })
})
