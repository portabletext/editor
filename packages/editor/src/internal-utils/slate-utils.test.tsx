import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test} from 'vitest'
import {InternalSlateEditorRefPlugin} from '../plugins/plugin.internal.slate-editor-ref'
import {createTestEditor} from '../test/vitest'
import type {PortableTextSlateEditor} from '../types/editor'
import {getFocusSpan} from './slate-utils'

describe(getFocusSpan.name, () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const stockTickerKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const imageKey = keyGenerator()
  const initialValue = [
    {
      _key: blockKey,
      _type: 'block',
      children: [
        {
          _type: 'span',
          _key: fooSpanKey,
          text: 'foo',
        },
        {
          _type: 'stock-ticker',
          _key: stockTickerKey,
        },
        {
          _type: 'span',
          _key: barSpanKey,
          text: 'bar',
        },
      ],
    },
    {
      _key: imageKey,
      _type: 'image',
    },
  ]
  const schemaDefinition = defineSchema({
    blockObjects: [{name: 'image'}],
    inlineObjects: [{name: 'stock-ticker'}],
  })

  test('Scenario: Text block span is selected', async () => {
    const slateEditorRef = React.createRef<PortableTextSlateEditor>()
    await createTestEditor({
      children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      schemaDefinition,
      initialValue,
      editableProps: {
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
            offset: 0,
          },
        },
      },
    })

    expect(getFocusSpan({editor: slateEditorRef.current!})).toEqual([
      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
      [0, 0],
    ])
  })

  test('Scenario: Inline object is selected', async () => {
    const slateEditorRef = React.createRef<PortableTextSlateEditor>()
    await createTestEditor({
      children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      schemaDefinition,
      initialValue,
      editableProps: {
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
            offset: 0,
          },
        },
      },
    })

    expect(getFocusSpan({editor: slateEditorRef.current!})).toEqual([
      undefined,
      undefined,
    ])
  })

  test('Scenario: Block object is selected', async () => {
    const slateEditorRef = React.createRef<PortableTextSlateEditor>()
    await createTestEditor({
      children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      schemaDefinition,
      initialValue,
      editableProps: {
        selection: {
          anchor: {path: [{_key: imageKey}], offset: 0},
          focus: {path: [{_key: imageKey}], offset: 0},
        },
      },
    })

    expect(getFocusSpan({editor: slateEditorRef.current!})).toEqual([
      undefined,
      undefined,
    ])
  })
})
