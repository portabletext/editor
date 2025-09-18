import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, PortableTextEditor} from '../src'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

describe(PortableTextEditor.addAnnotation.name, () => {
  test('Scenario: Prevents overlapping annotations of the same type', async () => {
    const keyGenerator = createTestKeyGenerator()
    const portableTextEditorRef = React.createRef<PortableTextEditor>()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor} = await createTestEditor({
      children: (
        <InternalPortableTextEditorRefPlugin ref={portableTextEditorRef} />
      ),
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooSpanKey, text: 'foo '},
            {_type: 'span', _key: barSpanKey, text: 'bar', marks: [linkKey]},
            {_type: 'span', _key: bazSpanKey, text: ' baz'},
          ],
          markDefs: [
            {_type: 'link', _key: linkKey, href: 'https://portabletext.org'},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    editor.send({
      type: 'select',
      at: getTextSelection(editor.getSnapshot().context, 'o bar b'),
    })

    PortableTextEditor.addAnnotation(
      portableTextEditorRef.current!,
      {name: 'link'},
      {href: 'https://sanity.io'},
    )

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'fo,o bar b,az',
      ])
    })
  })

  test('Scenario: Returns paths', async () => {
    const keyGenerator = createTestKeyGenerator()
    const portableTextEditorRef = React.createRef<PortableTextEditor>()
    const blockAKey = keyGenerator()
    const fizzBuzzSpanKey = keyGenerator()
    const blockBKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor} = await createTestEditor({
      children: (
        <InternalPortableTextEditorRefPlugin ref={portableTextEditorRef} />
      ),
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fizzBuzzSpanKey, text: 'fizz buzz'}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [
            {_type: 'span', _key: fooSpanKey, text: 'foo '},
            {_type: 'span', _key: barSpanKey, text: 'bar', marks: [linkKey]},
            {_type: 'span', _key: bazSpanKey, text: ' baz'},
          ],
          markDefs: [
            {
              _type: 'link',
              _key: linkKey,
              href: 'https://portabletext.org',
            },
          ],
        },
      ],
      schemaDefinition: defineSchema({
        annotations: [
          {name: 'link', fields: [{name: 'href', type: 'string'}]},
          {name: 'comment', fields: [{name: 'text', type: 'string'}]},
        ],
      }),
    })

    editor.send({
      type: 'select',
      at: getTextSelection(editor.getSnapshot().context, 'buzzo bar b'),
    })

    const paths = PortableTextEditor.addAnnotation(
      portableTextEditorRef.current!,
      {name: 'comment'},
      {text: 'Comment A'},
    )

    await vi.waitFor(() => {
      expect(paths).toEqual({
        markDefPath: [{_key: blockBKey}, 'markDefs', {_key: 'k12'}],
        markDefPaths: [
          [{_key: blockAKey}, 'markDefs', {_key: 'k9'}],
          [{_key: blockBKey}, 'markDefs', {_key: 'k12'}],
        ],
        spanPath: [{_key: blockBKey}, 'children', {_key: bazSpanKey}],
      })
    })
  })
})
