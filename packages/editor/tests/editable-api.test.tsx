import {defineSchema} from '@portabletext/schema'
import {createRef, type RefObject} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

describe('focusBlock', () => {
  test('Returns the text block at the focus point', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    const {locator} = await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusBlock(editorRef.current!)).toEqual({
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      })
    })
  })

  test('Returns the block object at the focus point', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    const {locator} = await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'img1',
        },
      ],
    })

    const imageElement = locator
      .element()
      .querySelector('[data-pt-path=\'[_key=="img1"]\']')

    expect(imageElement).not.toBeNull()
    await userEvent.click(imageElement!)

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusBlock(editorRef.current!)).toEqual({
        _type: 'image',
        _key: 'img1',
      })
    })
  })

  test('Returns undefined when no selection', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusBlock(editorRef.current!)).toBeUndefined()
    })
  })
})

describe('focusChild', () => {
  test('Returns the span at the focus point', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    const {locator} = await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusChild(editorRef.current!)).toEqual({
        _type: 'span',
        _key: 's1',
        text: 'foo',
        marks: [],
      })
    })
  })

  test('Returns the inline object at the focus point', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    const {locator} = await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'before '},
            {_type: 'stock-ticker', _key: 'st1'},
            {_type: 'span', _key: 's2', text: ' after'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const stockTickerElement = locator
      .element()
      .querySelector('[data-pt-path=\'[_key=="b1"].children[_key=="st1"]\']')

    expect(stockTickerElement).not.toBeNull()
    await userEvent.click(stockTickerElement!)

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusChild(editorRef.current!)).toEqual({
        _type: 'stock-ticker',
        _key: 'st1',
      })
    })
  })

  test('Returns undefined for block objects', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    const {locator} = await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'img1',
        },
      ],
    })

    const imageElement = locator
      .element()
      .querySelector('[data-pt-path=\'[_key=="img1"]\']')

    expect(imageElement).not.toBeNull()
    await userEvent.click(imageElement!)

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusChild(editorRef.current!)).toBeUndefined()
    })
  })

  test('Returns undefined when no selection', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()

    await createTestEditor({
      children: <InternalPortableTextEditorRefPlugin ref={editorRef} />,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(PortableTextEditor.focusChild(editorRef.current!)).toBeUndefined()
    })
  })
})
