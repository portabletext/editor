import {defineSchema} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import {createRef, type RefObject} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {InternalChange$Plugin} from '../src/plugins/plugin.internal.change-ref'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'
import type {EditorChange, EditorSelection} from '../src/types/editor'

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

    await createTestEditor({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'custom image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue,
      keyGenerator: () => 'bb',
    })

    // Given an empty text block
    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    // And no selection
    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getSelection(editorRef.current)).toBeNull()
      }
    })

    // When a new image is inserted
    await vi.waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'custom image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await vi.waitFor(() => {
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

    await createTestEditor({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'custom image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue,
      keyGenerator: () => 'bb',
    })

    // Given an non-empty text block
    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    // And no selection
    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getSelection(editorRef.current)).toBeNull()
      }
    })

    // When a new image is inserted
    await vi.waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'custom image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await vi.waitFor(() => {
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

    await createTestEditor({
      children: (
        <>
          <InternalChange$Plugin onChange={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'custom image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue,
      keyGenerator: () => 'bc',
    })

    // Given an empty text block followed by an image
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.select(editorRef.current, initialSelection)
      }
    })
    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'selection',
          selection: initialSelection,
        })
      }
    })

    // When a new image is inserted
    await vi.waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'custom image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {_key: 'bc', _type: 'custom image'},
          {_key: 'bb', _type: 'custom image'},
        ])
      }
    })
  })
})
