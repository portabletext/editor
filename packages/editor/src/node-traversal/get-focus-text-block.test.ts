import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {getFocusTextBlock} from './get-focus-text-block'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getFocusTextBlock.name, () => {
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
    expect(getFocusTextBlock(snapshot)).toEqual(undefined)
  })

  test('returns the focused root text block when focus is inside its span', () => {
    const path = [
      {_key: testbed.textBlock1._key},
      'children',
      {_key: testbed.span1._key},
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
    expect(getFocusTextBlock(snapshot)).toEqual({
      node: testbed.textBlock1,
      path: [{_key: testbed.textBlock1._key}],
    })
  })

  test('returns undefined when focus is on a root void block object', () => {
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
    expect(getFocusTextBlock(snapshot)).toEqual(undefined)
  })

  test('returns the container-line text block when focus is inside a code span', () => {
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
    expect(getFocusTextBlock(snapshot)).toEqual({
      node: testbed.codeLine1,
      path: [
        {_key: testbed.codeBlock._key},
        'code',
        {_key: testbed.codeLine1._key},
      ],
    })
  })

  test('returns the cell text block when focus is inside a table cell span', () => {
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
    expect(getFocusTextBlock(snapshot)).toEqual({
      node: testbed.cellBlock1,
      path: [
        {_key: testbed.table._key},
        'rows',
        {_key: testbed.row1._key},
        'cells',
        {_key: testbed.cell1._key},
        'content',
        {_key: testbed.cellBlock1._key},
      ],
    })
  })

  test('returns the text block itself when the focus path IS the text block', () => {
    const path = [{_key: testbed.textBlock1._key}]
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
    expect(getFocusTextBlock(snapshot)).toEqual({
      node: testbed.textBlock1,
      path,
    })
  })
})
