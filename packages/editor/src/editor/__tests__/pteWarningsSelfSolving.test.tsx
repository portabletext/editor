import type {PortableTextBlock} from '@sanity/types'
import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {createTestKeyGenerator} from '../../internal-utils/test-key-generator'
import {PortableTextEditor} from '../PortableTextEditor'
import {PortableTextEditorTester, schemaType} from './PortableTextEditorTester'

describe('when PTE would display warnings, instead it self solves', () => {
  it('when child at index is missing required _key in block with _key', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'myTestBlockType',
        children: [
          {
            _type: 'span',
            marks: [],
            text: 'Hello with a new key',
          },
        ],
        markDefs: [],
        style: 'normal',
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
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: 'Hello with a new key',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })

  it('self-solves missing .markDefs', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'myTestBlockType',
        children: [
          {
            _key: 'def',
            _type: 'span',
            marks: [],
            text: 'No markDefs',
          },
        ],
        style: 'normal',
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
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'def',
                _type: 'span',
                text: 'No markDefs',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })

  it('adds missing .children', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'myTestBlockType',
        style: 'normal',
        markDefs: [],
      },
      {
        _key: 'def',
        _type: 'myTestBlockType',
        style: 'normal',
        children: [],
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
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: '',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'def',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'k5',
                _type: 'span',
                text: '',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })

  it('removes orphaned marks', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'myTestBlockType',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'def',
            _type: 'span',
            marks: ['ghi'],
            text: 'Hello',
          },
        ],
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
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'def',
                _type: 'span',
                text: 'Hello',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })

  it('removes orphaned marksDefs', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'myTestBlockType',
        style: 'normal',
        markDefs: [
          {
            _key: 'ghi',
            _type: 'link',
            href: 'https://sanity.io',
          },
        ],
        children: [
          {
            _key: 'def',
            _type: 'span',
            marks: [],
            text: 'Hello',
          },
        ],
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
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'def',
                _type: 'span',
                text: 'Hello',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })

  it('allows empty array of blocks', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [] as PortableTextBlock[]

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
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'k2',
            _type: 'myTestBlockType',
            children: [{_key: 'k3', _type: 'span', marks: [], text: ''}],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
  })
})
