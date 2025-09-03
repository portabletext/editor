import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {PortableTextEditorTester} from './PortableTextEditorTester'

const INITIAL_VALUE: PortableTextBlock[] = [
  {
    _key: 'a',
    _type: 'block',
    children: [
      {
        _key: 'a1',
        _type: 'span',
        marks: [],
        text: 'This is some text in the block',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]

describe('plugin:withEditableAPI: .isSelectionsOverlapping', () => {
  it('returns true if the selections are partially overlapping', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        value={INITIAL_VALUE}
      />,
    )
    const selectionA = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 4},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 8},
    }

    const selectionB = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 2},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
    }

    await vi.waitFor(() => {
      if (editorRef.current) {
        const isOverlapping = PortableTextEditor.isSelectionsOverlapping(
          editorRef.current,
          selectionA,
          selectionB,
        )

        expect(isOverlapping).toBe(true)
      }
    })
  })

  it('returns true if the selections are fully overlapping', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        value={INITIAL_VALUE}
      />,
    )
    const selectionA = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 4},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 8},
    }

    const selectionB = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 4},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 8},
    }

    await vi.waitFor(() => {
      if (editorRef.current) {
        const isOverlapping = PortableTextEditor.isSelectionsOverlapping(
          editorRef.current,
          selectionA,
          selectionB,
        )

        expect(isOverlapping).toBe(true)
      }
    })
  })

  it('return true if selection is fully inside another selection', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        value={INITIAL_VALUE}
      />,
    )
    const selectionA = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 2},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 10},
    }

    const selectionB = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 4},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
    }

    await vi.waitFor(() => {
      if (editorRef.current) {
        const isOverlapping = PortableTextEditor.isSelectionsOverlapping(
          editorRef.current,
          selectionA,
          selectionB,
        )

        expect(isOverlapping).toBe(true)
      }
    })
  })

  it('returns false if the selections are not overlapping', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        value={INITIAL_VALUE}
      />,
    )
    const selectionA = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 4},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 8},
    }

    const selectionB = {
      focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 10},
      anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 12},
    }

    await vi.waitFor(() => {
      if (editorRef.current) {
        const isOverlapping = PortableTextEditor.isSelectionsOverlapping(
          editorRef.current,
          selectionA,
          selectionB,
        )

        expect(isOverlapping).toBe(false)
      }
    })
  })
})
