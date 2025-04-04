import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  PortableTextEditorTester,
  schemaType,
} from '../../__tests__/PortableTextEditorTester'
import {createTestKeyGenerator} from '../../../internal-utils/test-key-generator'
import {PortableTextEditor} from '../../PortableTextEditor'

describe('plugin:withPortableTextLists', () => {
  it('should return active list styles that cover the whole selection', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'a',
        _type: 'myTestBlockType',
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
        _type: 'myTestBlockType',
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
    const onChange = vi.fn()
    await waitFor(() => {
      render(
        <PortableTextEditorTester
          keyGenerator={createTestKeyGenerator()}
          onChange={onChange}
          ref={editorRef}
          schemaType={schemaType}
          value={initialValue}
        />,
      )
    })
    const editor = editorRef.current!
    expect(editor).toBeDefined()
    await waitFor(() => {
      PortableTextEditor.focus(editor)
      PortableTextEditor.select(editor, {
        focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
        anchor: {path: [{_key: '2'}, 'children', {_key: '2'}], offset: 2},
      })
      expect(PortableTextEditor.hasListStyle(editor, 'bullet')).toBe(false)
    })
  })
})
