import {Schema} from '@sanity/schema'
import type {PortableTextBlock} from '@sanity/types'
import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, test, vi} from 'vitest'
import type {EditorChange, EditorSelection} from '../../types/editor'
import {PortableTextEditable} from '../Editable'
import {PortableTextEditor} from '../PortableTextEditor'

const schema = Schema.compile({
  types: [
    {
      name: 'portable-text',
      type: 'array',
      of: [{type: 'block'}, {type: 'custom image'}],
    },
    {name: 'custom image', type: 'object'},
  ],
}).get('portable-text')

describe(PortableTextEditor.insertBlock.name, () => {
  test('Scenario: Inserting a custom block without a selection #1', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const emptyTextBlock: PortableTextBlock = {
      _key: 'ba',
      _type: 'block',
      children: [
        {
          _type: 'span',
          _key: 'sa',
          text: '',
          marks: [],
        },
      ],
      style: 'normal',
    }
    const initialValue: Array<PortableTextBlock> = [emptyTextBlock]
    const onChange: (change: EditorChange) => void = vi.fn()

    render(
      <PortableTextEditor
        ref={editorRef}
        schemaType={schema}
        value={initialValue}
        keyGenerator={() => 'bb'}
        onChange={onChange}
      >
        <PortableTextEditable />
      </PortableTextEditor>,
    )

    // Given an empty text block
    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    // And no selection
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getSelection(editorRef.current)).toBeNull()
      }
    })

    // When a new image is inserted
    await waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'custom image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {_key: 'bb', _type: 'custom image'},
        ])
      }
    })
  })

  test('Scenario: Inserting a custom block without a selection #2', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const nonEmptyTextBlock: PortableTextBlock = {
      _key: 'ba',
      _type: 'block',
      children: [
        {
          _type: 'span',
          _key: 'xs',
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const initialValue: Array<PortableTextBlock> = [nonEmptyTextBlock]
    const onChange: (change: EditorChange) => void = vi.fn()

    render(
      <PortableTextEditor
        ref={editorRef}
        schemaType={schema}
        value={initialValue}
        keyGenerator={() => 'bb'}
        onChange={onChange}
      >
        <PortableTextEditable />
      </PortableTextEditor>,
    )

    // Given an non-empty text block
    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    // And no selection
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getSelection(editorRef.current)).toBeNull()
      }
    })

    // When a new image is inserted
    await waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'custom image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          nonEmptyTextBlock,
          {_key: 'bb', _type: 'custom image'},
        ])
      }
    })
  })

  test('Scenario: Replacing an empty text block with a custom block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const emptyTextBlock: PortableTextBlock = {
      _key: 'ba',
      _type: 'block',
      children: [
        {
          _type: 'span',
          _key: 'sa',
          text: '',
          marks: [],
        },
      ],
      style: 'normal',
    }
    const imageBlock: PortableTextBlock = {
      _key: 'bb',
      _type: 'custom image',
    }
    const initialValue: Array<PortableTextBlock> = [emptyTextBlock, imageBlock]
    const onChange: (change: EditorChange) => void = vi.fn()

    render(
      <PortableTextEditor
        ref={editorRef}
        schemaType={schema}
        value={initialValue}
        keyGenerator={() => 'bc'}
        onChange={onChange}
      >
        <PortableTextEditable />
      </PortableTextEditor>,
    )

    // Given an empty text block followed by an image
    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    // And a selection in the empty text block
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: 'ba'}, 'children', {_key: 'sa'}], offset: 0},
      focus: {path: [{_key: 'ba'}, 'children', {_key: 'sa'}], offset: 0},
      backward: false,
    }
    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.select(editorRef.current, initialSelection)
      }
    })
    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'selection',
          selection: initialSelection,
        })
      }
    })

    // When a new image is inserted
    await waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'custom image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {_key: 'bc', _type: 'custom image'},
          {_key: 'bb', _type: 'custom image'},
        ])
      }
    })
  })
})
