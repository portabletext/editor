import {fireEvent, render, waitFor} from '@testing-library/react'
import {act, createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {PortableTextEditor} from '../PortableTextEditor'
import {PortableTextEditorTester, schemaType} from './PortableTextEditorTester'

async function getEditableElement(
  component: ReturnType<typeof render>,
): Promise<Element> {
  await act(async () => component)
  const element = component.container.querySelector(
    '[data-slate-editor="true"]',
  )
  if (!element) {
    throw new Error('Could not find element')
  }
  /**
   * Manually add this because JSDom doesn't implement this and Slate checks for it
   * internally before doing stuff.
   *
   * https://github.com/jsdom/jsdom/issues/1670
   */
  // @ts-ignore
  element.isContentEditable = true
  return element
}

describe('adds empty text block if its needed', () => {
  const newBlock = {
    _type: 'myTestBlockType',
    _key: '1',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: '2',
        text: '',
        marks: [],
      },
    ],
  }
  it('adds a new block at the bottom, when clicking on the portable text editor, because the only block is void and user is focused on that one', async () => {
    const initialValue = [
      {
        _key: 'b',
        _type: 'someObject',
      },
    ]

    const initialSelection = {
      focus: {path: [{_key: 'b'}], offset: 0},
      anchor: {path: [{_key: 'b'}], offset: 0},
    }

    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const component = render(
      <PortableTextEditorTester
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

    const element = await getEditableElement(component)

    await waitFor(() => {
      if (editorRef.current && element) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        fireEvent.click(element)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          initialValue[0],
          newBlock,
        ])
      }
    })
  })
  it('should not add blocks if the last element is a text block', async () => {
    const initialValue = [
      {
        _key: 'b',
        _type: 'someObject',
      },
      {
        _type: 'myTestBlockType',
        _key: '1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: '2',
            text: '',
            marks: [],
          },
        ],
      },
    ]

    const initialSelection = {
      focus: {path: [{_key: 'b'}], offset: 0},
      anchor: {path: [{_key: 'b'}], offset: 0},
    }

    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const component = render(
      <PortableTextEditorTester
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
      />,
    )
    const element = await getEditableElement(component)

    await waitFor(() => {
      if (editorRef.current && element) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        fireEvent.click(element)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual(
          initialValue,
        )
      }
    })
  })

  it('should not add blocks if the last element is void, but its not focused on that one', async () => {
    const initialValue = [
      {
        _key: 'a',
        _type: 'someObject',
      },
      {
        _type: 'myTestBlockType',
        _key: 'b',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'b1',
            text: '',
            marks: [],
          },
        ],
      },
      {
        _key: 'c',
        _type: 'someObject',
      },
    ]

    const initialSelection = {
      focus: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 0},
      anchor: {path: [{_key: 'b'}, 'children', {_key: 'b1'}], offset: 0},
    }

    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const component = render(
      <PortableTextEditorTester
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

    const element = await getEditableElement(component)

    await waitFor(() => {
      if (editorRef.current && element) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
        fireEvent.click(element)
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual(
          initialValue,
        )
      }
    })
  })

  it('should not add blocks if the last element is void, and its focused on that one when clicking', async () => {
    const initialValue = [
      {
        _key: 'a',
        _type: 'someObject',
      },
      {
        _type: 'myTestBlockType',
        _key: 'b',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'b1',
            text: '',
            marks: [],
          },
        ],
      },
      {
        _key: 'c',
        _type: 'someObject',
      },
    ]

    const initialSelection = {
      focus: {path: [{_key: 'c'}], offset: 0},
      anchor: {path: [{_key: 'c'}], offset: 0},
    }

    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const component = render(
      <PortableTextEditorTester
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

    const element = await getEditableElement(component)

    const editor = editorRef.current
    const inlineType = editor?.schemaTypes.inlineObjects.find(
      (t) => t.name === 'someObject',
    )
    await waitFor(() => {
      if (editor && inlineType && element) {
        PortableTextEditor.focus(editor)
        PortableTextEditor.select(editor, initialSelection)
        fireEvent.click(element)
        expect(PortableTextEditor.getValue(editor)).toEqual(
          initialValue.concat(newBlock),
        )
      }
    })
  })
})
