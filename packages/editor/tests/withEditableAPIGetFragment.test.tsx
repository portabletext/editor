import {compileSchema, defineSchema, isTextBlock} from '@portabletext/schema'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {InternalEditorChangePlugin} from '../src/plugins/plugin.internal.editor-change-ref'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

const initialValue = [
  {
    _key: 'a',
    _type: 'block',
    children: [
      {
        _key: 'a1',
        _type: 'span',
        marks: [],
        text: 'Block A',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
  {
    _key: 'b',
    _type: 'block',
    children: [
      {
        _key: 'b1',
        _type: 'span',
        marks: [],
        text: 'Block B ',
      },
      {
        _key: 'b2',
        _type: 'someObject',
      },
      {
        _key: 'b3',
        _type: 'span',
        marks: [],
        text: ' contains a inline object',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]

describe('plugin:withEditableAPI: .getFragment()', () => {
  it('can get a Portable Text fragment of the current selection in a single block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <InternalEditorChangePlugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'someObject', fields: [{name: 'color', type: 'string'}]},
        ],
      }),
    })

    const initialSelection = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 7},
    }

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        const fragment = PortableTextEditor.getFragment(editorRef.current)
        expect(
          fragment &&
            isTextBlock(
              {
                schema: compileSchema(defineSchema({})),
              },
              fragment[0],
            ) &&
            fragment[0]?.children[0]?.text,
        ).toBe('A')
      }
    })
  })

  it('can get a Portable Text fragment of the current selection in multiple blocks', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <InternalEditorChangePlugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'someObject', fields: [{name: 'color', type: 'string'}]},
        ],
      }),
    })

    const initialSelection = {
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
      focus: {path: [{_key: 'b'}, 'children', {_key: 'b3'}], offset: 9},
    }

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        const fragment = PortableTextEditor.getFragment(editorRef.current)
        expect(fragment).toMatchInlineSnapshot(`
          [
            {
              "_key": "a",
              "_type": "block",
              "children": [
                {
                  "_key": "a1",
                  "_type": "span",
                  "marks": [],
                  "text": "A",
                },
              ],
              "markDefs": [],
              "style": "normal",
            },
            {
              "_key": "b",
              "_type": "block",
              "children": [
                {
                  "_key": "b1",
                  "_type": "span",
                  "marks": [],
                  "text": "Block B ",
                },
                {
                  "_key": "b2",
                  "_type": "someObject",
                },
                {
                  "_key": "b3",
                  "_type": "span",
                  "marks": [],
                  "text": " contains",
                },
              ],
              "markDefs": [],
              "style": "normal",
            },
          ]
        `)
      }
    })
  })
})
