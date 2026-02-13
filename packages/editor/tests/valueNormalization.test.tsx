import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {defineSchema} from '../src'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {InternalEditorChangePlugin} from '../src/plugins/plugin.internal.editor-change-ref'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

describe('values: normalization', () => {
  it("accepts incoming value with blocks without a style or markDefs prop, but doesn't leave them without them when editing them", async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: '5fc57af23597',
        _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <InternalEditorChangePlugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })

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
            _type: 'block',
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
