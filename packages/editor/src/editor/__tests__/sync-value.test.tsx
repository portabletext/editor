import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {createTestKeyGenerator} from '../../internal-utils/test-key-generator'
import {PortableTextEditor} from '../PortableTextEditor'
import {PortableTextEditorTester, schemaType} from './PortableTextEditorTester'

const initialValue = [
  {
    _key: '77071c3af231',
    _type: 'myTestBlockType',
    children: [
      {
        _key: 'c001f0e92c1f0',
        _type: 'span',
        marks: [],
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]

describe('useSyncValue', () => {
  it('updates span text', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const syncedValue = [
      {
        _key: '77071c3af231',
        _type: 'myTestBlockType',
        children: [
          {
            _key: 'c001f0e92c1f0',
            _type: 'span',
            marks: [],
            text: 'Lorem my ipsum!',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {rerender} = render(
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

    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={syncedValue}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual(
          syncedValue,
        )
      }
    })
  })

  it('replaces span nodes with different keys inside the same children array', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const syncedValue = [
      {
        _key: '77071c3af231',
        _type: 'myTestBlockType',
        children: [
          {
            _key: 'c001f0e92c1f0__NEW_KEY_YA!',
            _type: 'span',
            marks: [],
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {rerender} = render(
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

    rerender(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={syncedValue}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: '77071c3af231',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'c001f0e92c1f0__NEW_KEY_YA!',
                _type: 'span',
                marks: [],
                text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ',
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
