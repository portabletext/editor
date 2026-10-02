import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, PortableTextEditor, type Editor, type Path} from '../src'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

describe('toggling a mark', () => {
  test('Scenario: Toggles the decorator on a pending DOM selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const portableTextEditorRef = React.createRef<PortableTextEditor>()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      children: (
        <InternalPortableTextEditorRefPlugin ref={portableTextEditorRef} />
      ),
      keyGenerator,
      initialValue: [
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })
    const fooPath = [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}]
    const barPath = [{_key: barBlockKey}, 'children', {_key: barSpanKey}]
    const fooTextNode = getSpanTextNode(editor, fooPath)
    const barTextNode = getSpanTextNode(editor, barPath)

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {path: barPath, offset: 3},
        focus: {path: barPath, offset: 3},
      },
    })

    await vi.waitFor(() => {
      const domSelection = document.getSelection()
      expect({
        model: editor.getSnapshot().context.selection,
        dom: {
          anchorNode: domSelection?.anchorNode,
          anchorOffset: domSelection?.anchorOffset,
          focusNode: domSelection?.focusNode,
          focusOffset: domSelection?.focusOffset,
        },
      }).toEqual({
        model: {
          anchor: {path: barPath, offset: 3},
          focus: {path: barPath, offset: 3},
          backward: false,
        },
        dom: {
          anchorNode: barTextNode,
          anchorOffset: 3,
          focusNode: barTextNode,
          focusOffset: 3,
        },
      })
    })

    document.getSelection()!.setBaseAndExtent(fooTextNode, 0, fooTextNode, 3)
    document.dispatchEvent(new Event('selectionchange'))

    PortableTextEditor.toggleMark(portableTextEditorRef.current!, 'strong')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: barBlockKey,
          _type: 'block',
          children: [{_key: barSpanKey, _type: 'span', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})

function getSpanTextNode(editor: Editor, spanPath: Path): Node {
  const snapshot = editor.getSnapshot()
  const point = {path: spanPath, offset: 0}
  const [spanNode] = editor.dom.getChildNodes({
    ...snapshot,
    context: {...snapshot.context, selection: {anchor: point, focus: point}},
  })
  const textNode = spanNode
    ? document.createTreeWalker(spanNode, NodeFilter.SHOW_TEXT).nextNode()
    : null

  if (!textNode) {
    throw new Error('Could not find the text node of the span')
  }

  return textNode
}
