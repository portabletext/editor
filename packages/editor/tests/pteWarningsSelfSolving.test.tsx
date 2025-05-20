import type {PortableTextBlock} from '@sanity/types'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  PortableTextEditorTester,
  schemaType,
} from '../src/editor/__tests__/PortableTextEditorTester'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'

describe('when PTE would display warnings, instead it self solves', () => {
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
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'k2',
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
                _key: 'k3',
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
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await vi.waitFor(() => {
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

  it('allows undefined value', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
      />,
    )

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'k0',
            _type: 'myTestBlockType',
            children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
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
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'k0',
            _type: 'myTestBlockType',
            children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })
})
