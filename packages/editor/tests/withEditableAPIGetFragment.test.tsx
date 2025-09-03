import {compileSchema, isTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {
  PortableTextEditorTester,
  schemaDefinition,
} from './PortableTextEditorTester'

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

    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        value={initialValue}
      />,
    )
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
                schema: compileSchema(schemaDefinition),
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

    await vi.waitFor(() =>
      render(
        <PortableTextEditorTester
          keyGenerator={createTestKeyGenerator()}
          onChange={onChange}
          ref={editorRef}
          value={initialValue}
        />,
      ),
    )
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
