import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  PortableTextEditorTester,
  schemaType,
} from '../../editor/__tests__/PortableTextEditorTester'
import {PortableTextEditor} from '../../editor/PortableTextEditor'
import {createTestKeyGenerator} from '../test-key-generator'

describe('values: normalization', () => {
  it("accepts incoming value with blocks without a style or markDefs prop, but doesn't leave them without them when editing them", async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: '5fc57af23597',
        _type: 'myTestBlockType',
        children: [
          {
            _key: 'be1c67c6971a',
            _type: 'span',
            marks: [],
            text: 'Hello',
          },
        ],
        markDefs: [],
      },
    ]
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
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, {
          focus: {
            path: [{_key: '5fc57af23597'}, 'children', {_key: 'be1c67c6971a'}],
            offset: 0,
          },
          anchor: {
            path: [{_key: '5fc57af23597'}, 'children', {_key: 'be1c67c6971a'}],
            offset: 5,
          },
        })
        PortableTextEditor.toggleMark(editorRef.current, 'strong')
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: '5fc57af23597',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'be1c67c6971a',
                _type: 'span',
                marks: ['strong'],
                text: 'Hello',
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
