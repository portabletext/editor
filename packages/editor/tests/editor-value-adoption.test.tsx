import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorSelection} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

const helloBlock: PortableTextBlock = {
  _key: '123',
  _type: 'block',
  markDefs: [],
  children: [{_key: '567', _type: 'span', text: 'Hello', marks: []}],
}

const renderPlaceholder = () => 'Jot something down here'

describe('initialization', () => {
  test('Scenario: mounting emits `ready` and shows a custom placeholder', async () => {
    const onChange = vi.fn()

    const {locator} = await createTestEditor({
      children: <EventListenerPlugin on={onChange} />,
      editableProps: {renderPlaceholder},
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      expect(locator.getByText('Jot something down here')).toBeInTheDocument()
    })
  })

  test('Scenario: the placeholder is not text before the caret in an empty editor', async () => {
    const {locator} = await createTestEditor({
      editableProps: {renderPlaceholder},
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      const selection = window.getSelection()
      expect(selection?.rangeCount).toEqual(1)
      const textBeforeCaret = document.createRange()
      textBeforeCaret.setStart(locator.element(), 0)
      textBeforeCaret.setEnd(selection!.anchorNode!, selection!.anchorOffset)
      expect(textBeforeCaret.toString()).toEqual('\uFEFF')
    })
    expect(locator.getByText('Jot something down here')).toBeInTheDocument()
  })

  test('Scenario: the placeholder sits on the empty line', async () => {
    const {locator} = await createTestEditor({
      editableProps: {renderPlaceholder},
    })

    await vi.waitFor(() => {
      const placeholder = locator.getByText('Jot something down here').element()
      const block = locator.element().firstElementChild!
      expect(placeholder.getBoundingClientRect().top).toBeCloseTo(
        block.getBoundingClientRect().top,
        0,
      )
    })
  })

  test('Scenario: adoption keeps `initialValue` unchanged, and a local edit fills in the missing `style`', async () => {
    const initialValue = [helloBlock]
    const onChange = vi.fn()

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onChange} />,
      initialValue,
    })

    // Adoption keeps the value exactly as given: the missing `style` is
    // not filled in on load.
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
    expect(editor.getSnapshot().context.value).toStrictEqual([...initialValue])

    // A local edit touching the block fills in and emits the missing
    // `style` as part of that edit, and the editor's own document agrees.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 5},
        focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 5},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(
        onChange.mock.calls.flatMap(([event]) =>
          event.type === 'change' && event.origin === 'local'
            ? event.patches
            : [],
        ),
      ).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: '123'}, 'children', {_key: '567'}, 'text'],
          value: '@@ -1,5 +1,6 @@\n Hello\n+!\n',
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: '123'}, 'style'],
          value: 'normal',
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toStrictEqual([
        {
          _key: '123',
          _type: 'block',
          markDefs: [],
          children: [{_key: '567', _type: 'span', text: 'Hello!', marks: []}],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: an edit on one block emits none of the default fills for a block it leaves untouched', async () => {
    const completeBlock: PortableTextBlock = {
      _key: 'aaa',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: 'a1', _type: 'span', text: 'Alpha', marks: []}],
    }
    const bareBlock: PortableTextBlock = {
      // Missing `style`, `markDefs`, and the span's `marks`: the shape an
      // API-created document ships with.
      _key: 'bbb',
      _type: 'block',
      children: [{_key: 'b1', _type: 'span', text: 'Beta'}],
    }
    const onChange = vi.fn()

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onChange} />,
      initialValue: [completeBlock, bareBlock],
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'aaa'}, 'children', {_key: 'a1'}], offset: 5},
        focus: {path: [{_key: 'aaa'}, 'children', {_key: 'a1'}], offset: 5},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toStrictEqual([
        {
          ...completeBlock,
          children: [{_key: 'a1', _type: 'span', text: 'Alpha!', marks: []}],
        },
        bareBlock,
      ])
    })

    expect(
      onChange.mock.calls.flatMap(([event]) =>
        event.type === 'change' && event.origin === 'local'
          ? event.patches
          : [],
      ),
    ).toEqual([
      {
        type: 'diffMatchPatch',
        path: [{_key: 'aaa'}, 'children', {_key: 'a1'}, 'text'],
        value: '@@ -1,5 +1,6 @@\n Alpha\n+!\n',
        origin: 'local',
      },
    ])
  })

  test('Scenario: an initial selection from props is adopted', async () => {
    const initialValue = [helloBlock]
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      backward: false,
    }
    const onChange = vi.fn()

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onChange} />,
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toStrictEqual(
        initialSelection,
      )
    })
  })

  test('Scenario: the selection object keeps referential identity across reads when it has not changed', async () => {
    const initialValue = [helloBlock]
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
      backward: false,
    }
    const onChange = vi.fn()

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onChange} />,
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })

    const sel = editor.getSnapshot().context.selection
    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      const anotherSel = editor.getSnapshot().context.selection
      expect(anotherSel).toStrictEqual(initialSelection)
      expect(sel).toBe(anotherSel)
    })
  })

  test('Scenario: an empty array `initialValue` is adopted when ready', async () => {
    const initialValue: PortableTextBlock[] = []
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
      focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
    }
    const onChange = vi.fn()

    await createTestEditor({
      children: <EventListenerPlugin on={onChange} />,
      initialValue,
      editableProps: {selection: initialSelection},
    })

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({type: 'ready'})
    })
  })
})
