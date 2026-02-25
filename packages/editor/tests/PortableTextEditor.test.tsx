import type {PortableTextBlock} from '@portabletext/schema'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import type {EditorSelection} from '../src'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {EventListenerPlugin} from '../src/plugins'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'

const helloBlock: PortableTextBlock = {
  _key: '123',
  _type: 'block',
  markDefs: [],
  children: [{_key: '567', _type: 'span', text: 'Hello', marks: []}],
}

const renderPlaceholder = () => 'Jot something down here'

describe('initialization', () => {
  it('receives initial onChange events and has custom placeholder', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    const {locator} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      editableProps: {renderPlaceholder},
    })

    await vi.waitFor(() => {
      expect(editorRef.current).not.toBe(null)
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      expect(locator.getByText('Jot something down here')).toBeInTheDocument()
    })
  })

  it('takes value from props and confirms it by emitting value change event', async () => {
    const initialValue = [helloBlock]
    const onChange = vi.fn()
    const editorRef = createRef<PortableTextEditor>()

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
    })

    const normalizedEditorValue = [{...initialValue[0], style: 'normal'}]
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'value changed',
        value: initialValue,
      })
    })
    if (editorRef.current) {
      expect(PortableTextEditor.getValue(editorRef.current)).toStrictEqual(
        normalizedEditorValue,
      )
    }
  })

  it('takes initial selection from props', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [helloBlock]
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      backward: false,
    }
    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        expect(
          PortableTextEditor.getSelection(editorRef.current),
        ).toStrictEqual(initialSelection)
      }
    })
  })

  it('updates editor selection from new prop and keeps object equality in editor.getSelection()', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue = [helloBlock]
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
      backward: false,
    }
    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        const sel = PortableTextEditor.getSelection(editorRef.current)
        PortableTextEditor.focus(editorRef.current)

        // Test for object equality here!
        const anotherSel = PortableTextEditor.getSelection(editorRef.current)
        expect(
          PortableTextEditor.getSelection(editorRef.current),
        ).toStrictEqual(initialSelection)
        expect(sel).toBe(anotherSel)
      }
    })
  })

  it('handles empty array value', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue: PortableTextBlock[] = []
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
    }
    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).not.toHaveBeenCalledWith({
          type: 'invalid value',
          value: initialValue,
          resolution: {
            action: 'Unset the value',
            description:
              'Editor value must be an array of Portable Text blocks, or undefined.',
            item: initialValue,
            patches: [
              {
                path: [],
                type: 'unset',
              },
            ],
          },
        })
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })
  })

  it('validates a non-initial value', async () => {
    let value: PortableTextBlock[] = [helloBlock]
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
    }
    const onChange = vi.fn()
    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
        </>
      ),
      initialValue: value,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      expect(onChange).not.toHaveBeenCalledWith({
        type: 'invalid value',
        value,
        resolution: {
          action: 'Unset the value',
          description:
            'Editor value must be an array of Portable Text blocks, or undefined.',
          item: value,
          patches: [
            {
              path: [],
              type: 'unset',
            },
          ],
        },
      })
      expect(onChange).toHaveBeenCalledWith({type: 'value changed', value})
    })
    value = [{_type: 'banana', _key: '123'}]

    editor.send({type: 'update value', value})

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: 'invalid value',
        value,
        resolution: {
          action: 'Remove the block',
          description: "Block with _key '123' has invalid _type 'banana'",
          item: value[0],
          patches: [
            {
              path: [{_key: '123'}],
              type: 'unset',
            },
          ],
          i18n: {
            action: 'inputs.portable-text.invalid-value.disallowed-type.action',
            description:
              'inputs.portable-text.invalid-value.disallowed-type.description',
            values: {
              key: '123',
              typeName: 'banana',
            },
          },
        },
      })
    })
  })

  it("doesn't crash when containing a invalid block somewhere inside the content", async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const initialValue: PortableTextBlock[] = [
      helloBlock,
      {
        _key: 'abc',
        _type: 'block',
        markDefs: [],
        children: [{_key: 'def', _type: 'span', marks: []}],
      },
    ]
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
    }
    const onChange = vi.fn()

    await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'invalid value',
          value: initialValue,
          resolution: {
            action: 'Write an empty text property to the object',
            description:
              "Child with _key 'def' in block with key 'abc' has missing or invalid text property!",
            i18n: {
              action:
                'inputs.portable-text.invalid-value.invalid-span-text.action',
              description:
                'inputs.portable-text.invalid-value.invalid-span-text.description',
              values: {
                key: 'abc',
                childKey: 'def',
              },
            },
            item: {
              _key: 'abc',
              _type: 'block',
              children: [
                {
                  _key: 'def',
                  _type: 'span',
                  marks: [],
                },
              ],
              markDefs: [],
            },
            patches: [
              {
                path: [
                  {
                    _key: 'abc',
                  },
                  'children',
                  {
                    _key: 'def',
                  },
                ],
                type: 'set',
                value: {
                  _key: 'def',
                  _type: 'span',
                  marks: [],
                  text: '',
                },
              },
            ],
          },
        })
      }
    })
    expect(onChange).not.toHaveBeenCalledWith({
      type: 'value changed',
      value: initialValue,
    })
    expect(onChange).toHaveBeenCalledWith({type: 'ready'})
  })
})
