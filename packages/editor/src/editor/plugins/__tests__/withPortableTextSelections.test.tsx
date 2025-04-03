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
        text: "It's a beautiful day on planet earth",
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
        text: 'The birds are singing',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]

describe('plugin:withPortableTextSelections', () => {
  it('will report that a selection is made backward', async () => {
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
      anchor: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 9},
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 7},
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
        expect(PortableTextEditor.getSelection(editorRef.current))
          .toMatchInlineSnapshot(`
          {
            "anchor": {
              "offset": 9,
              "path": [
                {
                  "_key": "b",
                },
                "children",
                {
                  "_key": "b1",
                },
              ],
            },
            "backward": true,
            "focus": {
              "offset": 7,
              "path": [
                {
                  "_key": "a",
                },
                "children",
                {
                  "_key": "a1",
                },
              ],
            },
          }
        `)
      }
    })
  })
})
