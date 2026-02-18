import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

describe('plugin:withPortableTextLists', () => {
  it('should return active list styles that cover the whole selection', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'a',
        _type: 'block',
        children: [
          {
            _key: 'a1',
            _type: 'span',
            marks: [],
            text: '12',
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
            _key: '2',
            _type: 'span',
            marks: [],
            text: '34',
            level: 1,
            listItem: 'bullet',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    await createTestEditor({
      children: (
        <>
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    const editor = editorRef.current!
    expect(editor).toBeDefined()
    await vi.waitFor(() => {
      PortableTextEditor.focus(editor)
      PortableTextEditor.select(editor, {
        focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
        anchor: {path: [{_key: '2'}, 'children', {_key: '2'}], offset: 2},
      })
      expect(PortableTextEditor.hasListStyle(editor, 'bullet')).toBe(false)
    })
  })
})
