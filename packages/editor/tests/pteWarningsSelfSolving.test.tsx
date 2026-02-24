import type {PortableTextBlock} from '@portabletext/schema'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {EventListenerPlugin} from '../src/plugins'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

describe('when PTE would display warnings, instead it self solves', () => {
  it('when child at index is missing required _key in block with _key', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [
      {
        _key: 'abc',
        _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
        value: initialValue,
      })
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    await vi.waitFor(() => {
      expect(editorRef.current).not.toBeNull()

      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'abc',
            _type: 'block',
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
        _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
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
            _type: 'block',
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
        _type: 'block',
        style: 'normal',
        markDefs: [],
      },
      {
        _key: 'def',
        _type: 'block',
        style: 'normal',
        children: [],
        markDefs: [],
      },
    ]

    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
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
            _type: 'block',
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
            _type: 'block',
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
        _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
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
            _type: 'block',
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
        _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
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
            _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'k0',
            _type: 'block',
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

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
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
            _type: 'block',
            children: [{_key: 'k1', _type: 'span', marks: [], text: ''}],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })
  })
})
