import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  PortableTextEditorTester,
  schemaType,
} from '../../__tests__/PortableTextEditorTester'
import {isTextBlock} from '../../../internal-utils/parse-blocks'
import {createTestKeyGenerator} from '../../../internal-utils/test-key-generator'
import {legacySchemaToEditorSchema} from '../../editor-schema'
import {PortableTextEditor} from '../../PortableTextEditor'

const initialValue = [
  {
    _key: 'a',
    _type: 'myTestBlockType',
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
    _type: 'myTestBlockType',
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
        schemaType={schemaType}
        value={initialValue}
      />,
    )
    const initialSelection = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 7},
    }

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        const fragment = PortableTextEditor.getFragment(editorRef.current)
        expect(
          fragment &&
            isTextBlock(
              {
                schema: legacySchemaToEditorSchema(
                  editorRef.current.schemaTypes,
                ),
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

    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
      />,
    )
    const initialSelection = {
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
      focus: {path: [{_key: 'b'}, 'children', {_key: 'b3'}], offset: 9},
    }

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        const fragment = PortableTextEditor.getFragment(editorRef.current)
        expect(fragment).toMatchInlineSnapshot(`
          [
            {
              "_key": "a",
              "_type": "myTestBlockType",
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
              "_type": "myTestBlockType",
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
