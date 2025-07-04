import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  PortableTextEditorTester,
  schemaType,
} from '../../__tests__/PortableTextEditorTester'
import {createTestKeyGenerator} from '../../../internal-utils/test-key-generator'
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
        text: 'Block B',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]

const initialSelection = {
  focus: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 7},
  anchor: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 7},
}

describe('plugin:withEditableAPI: .delete()', () => {
  it('deletes block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    render(
      <PortableTextEditorTester
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

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
        PortableTextEditor.delete(
          editorRef.current,
          PortableTextEditor.getSelection(editorRef.current),
          {mode: 'blocks'},
        )
        expect(PortableTextEditor.getValue(editorRef.current))
          .toMatchInlineSnapshot(`
          [
            {
              "_key": "a",
              "_type": "myTestBlockType",
              "children": [
                {
                  "_key": "a1",
                  "_type": "span",
                  "marks": [],
                  "text": "Block A",
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

  it('deletes all the blocks, but leaves a placeholder block', async () => {
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

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.delete(
          editorRef.current,
          {
            focus: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 7},
            anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          },
          {mode: 'blocks'},
        )
      }
    })
    await waitFor(() => {
      if (editorRef.current) {
        // New keys here confirms that a placeholder block has been created
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'k2',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                marks: [],
                text: '',
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })

  it('deletes children', async () => {
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
        PortableTextEditor.select(editorRef.current, {
          focus: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 5},
          anchor: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 7},
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.delete(
          editorRef.current,
          PortableTextEditor.getSelection(editorRef.current),
          {mode: 'children'},
        )
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current))
          .toMatchInlineSnapshot(`
                  [
                    {
                      "_key": "a",
                      "_type": "myTestBlockType",
                      "children": [
                        {
                          "_key": "a1",
                          "_type": "span",
                          "marks": [],
                          "text": "Block A",
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
                          "_key": "k2",
                          "_type": "span",
                          "marks": [],
                          "text": "",
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

  it('deletes selected', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

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
        PortableTextEditor.select(editorRef.current, {
          focus: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 5},
          anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.delete(
          editorRef.current,
          PortableTextEditor.getSelection(editorRef.current),
          {mode: 'selected'},
        )
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'b',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'b1',
                _type: 'span',
                marks: [],
                text: ' B',
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })
})
