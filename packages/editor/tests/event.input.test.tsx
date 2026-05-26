import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../test-utils/text-selection'

describe('event.input.*', () => {
  test('Scenario: text/html equal to text/plain', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'em'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'hello wrold',
              marks: ['em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    const selection = getTextSelection(editor.getSnapshot().context, 'wrold')

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    // Simulate Safari text replacement
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'world')
    dataTransfer.setData('text/html', 'world')

    editor.send({
      type: 'input.*',
      originEvent: {dataTransfer},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'hello world',
              marks: ['em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'world'),
      )
    })
  })

  test('Scenario: only text/plain', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: spanKey,
          text: 'hello wrold',
          marks: ['em'],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'em'}],
      }),
      initialValue: [block],
    })

    await userEvent.click(locator)

    const selection = getTextSelection(editor.getSnapshot().context, 'wrold')

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'world')

    editor.send({
      type: 'input.*',
      originEvent: {dataTransfer},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'hello world',
              marks: ['em'],
            },
          ],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'world'),
      )
    })
  })

  test('Scenario: multi-line text/plain falls through to deserialize', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: spanKey,
          text: 'hello wrold',
          marks: ['em'],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'em'}],
      }),
      initialValue: [block],
    })

    await userEvent.click(locator)

    const selection = getTextSelection(editor.getSnapshot().context, 'wrold')

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'world\n\nmore')

    editor.send({
      type: 'input.*',
      originEvent: {dataTransfer},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'hello world',
              marks: ['em'],
            },
          ],
        },
        {
          _key: 'k9',
          _type: 'block',
          children: [
            {
              _type: 'span',
              _key: 'k11',
              text: 'more',
              marks: ['em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: text/plain with soft break', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: spanKey,
          text: 'hello wrold',
          marks: ['em'],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'em'}],
      }),
      initialValue: [block],
    })

    await userEvent.click(locator)

    const selection = getTextSelection(editor.getSnapshot().context, 'wrold')

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'world\nmore')

    editor.send({
      type: 'input.*',
      originEvent: {dataTransfer},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'hello world\nmore',
              marks: ['em'],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: multi-line text/html equal to text/plain falls through to deserialize', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: spanKey,
          text: 'hello wrold',
          marks: ['em'],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'em'}],
      }),
      initialValue: [block],
    })

    await userEvent.click(locator)

    const selection = getTextSelection(editor.getSnapshot().context, 'wrold')

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'world\n\nmore')
    dataTransfer.setData('text/html', 'world\n\nmore')

    editor.send({
      type: 'input.*',
      originEvent: {dataTransfer},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'hello world',
              marks: ['em'],
            },
          ],
        },
        {
          _key: 'k9',
          _type: 'block',
          children: [
            {
              _type: 'span',
              _key: 'k11',
              text: 'more',
              marks: ['em'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: insertReplacementText lands at targetRange', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'I has a problem', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const editorEl = locator.element() as HTMLElement
    editorEl.focus()
    const textNode = editorEl.querySelector('[data-slate-string]')!
      .childNodes[0] as Text

    document.getSelection()!.setBaseAndExtent(textNode, 15, textNode, 15)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(15)
    })

    // A fresh edit dirties the node-map and shifts the selection. The
    // browser then fires the replacement event before the next React paint.
    editor.send({type: 'insert.text', text: '!'})

    const liveTextNode = editorEl.querySelector('[data-slate-string]')!
      .childNodes[0] as Text
    const targetRange = document.createRange()
    targetRange.setStart(liveTextNode, 2)
    targetRange.setEnd(liveTextNode, 5)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'have')

    const beforeInput = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertReplacementText',
      data: 'have',
      dataTransfer,
    })
    Object.defineProperty(beforeInput, 'getTargetRanges', {
      value: () => [targetRange],
    })

    editorEl.dispatchEvent(beforeInput)

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'I have a problem!',
      ])
    })

    // The caret should land right after the inserted replacement.
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 6,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 6,
      },
      backward: false,
    })
  })

  test('Scenario: insertReplacementText with cross-block targetRange lands at targetRange', async () => {
    const keyGenerator = createTestKeyGenerator()
    const li1Key = keyGenerator()
    const li1SpanKey = keyGenerator()
    const li2Key = keyGenerator()
    const li2SpanKey = keyGenerator()
    const li3Key = keyGenerator()
    const li3SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: li1Key,
          children: [
            {_type: 'span', _key: li1SpanKey, text: 'first item', marks: []},
          ],
          markDefs: [],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
        },
        {
          _type: 'block',
          _key: li2Key,
          children: [
            {_type: 'span', _key: li2SpanKey, text: 'second item', marks: []},
          ],
          markDefs: [],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
        },
        {
          _type: 'block',
          _key: li3Key,
          children: [
            {
              _type: 'span',
              _key: li3SpanKey,
              text: 'I has a problem',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
          level: 1,
          listItem: 'bullet',
        },
      ],
    })

    const editorEl = locator.element() as HTMLElement
    editorEl.focus()

    // Place caret in middle of li2 (the user is editing here)
    const li2TextNode = editorEl.querySelector(
      `[data-block-key="${li2Key}"] [data-slate-string]`,
    )!.childNodes[0] as Text
    document.getSelection()!.setBaseAndExtent(li2TextNode, 6, li2TextNode, 6)
    await vi.waitFor(() => {
      const sel = editor.getSnapshot().context.selection
      expect(sel?.focus.offset).toBe(6)
    })

    // Recent edit (matches video: user has just been typing)
    editor.send({type: 'insert.text', text: 'X'})

    // Grammarly accepts a suggestion in li3 (a different block from caret).
    // Browser fires beforeinput with targetRange pointing into li3.
    const li3TextNode = editorEl.querySelector(
      `[data-block-key="${li3Key}"] [data-slate-string]`,
    )!.childNodes[0] as Text
    const targetRange = document.createRange()
    targetRange.setStart(li3TextNode, 2)
    targetRange.setEnd(li3TextNode, 5)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'have')

    const beforeInput = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertReplacementText',
      data: 'have',
      dataTransfer,
    })
    Object.defineProperty(beforeInput, 'getTargetRanges', {
      value: () => [targetRange],
    })

    editorEl.dispatchEvent(beforeInput)

    // The replacement must land in li3 (where the targetRange was), NOT in li2
    // (where the caret was). li2's text should still have just the typed 'X'.
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        '>-:first item',
        '>-:secondX item',
        '>-:I have a problem',
      ])
    })

    // The caret should land right after the inserted replacement in li3,
    // not back in li2 where the user was typing.
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: li3Key}, 'children', {_key: li3SpanKey}],
        offset: 6,
      },
      focus: {
        path: [{_key: li3Key}, 'children', {_key: li3SpanKey}],
        offset: 6,
      },
      backward: false,
    })
  })

  test('Scenario: insertReplacementText falls back to DOM selection when getTargetRanges is empty', async () => {
    // Repro for Grammarly in iframe-hosted Studios (Sanity Dashboard). The
    // extension sets the DOM selection to the misspelled word and then fires
    // a `beforeinput` event whose `getTargetRanges()` is empty (the iframe
    // context strips it). The replacement should still land at the visually
    // selected word.
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'wat is the problem',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const editorEl = locator.element() as HTMLElement
    editorEl.focus()
    const textNode = editorEl.querySelector('[data-slate-string]')!
      .childNodes[0] as Text

    document.getSelection()!.setBaseAndExtent(textNode, 18, textNode, 18)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(18)
    })

    // Simulate the extension selecting "wat" (0..3) visually in the DOM but
    // without letting Slate's selectionchange listener catch up.
    document.getSelection()!.setBaseAndExtent(textNode, 0, textNode, 3)

    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', 'What')

    const beforeInput = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertReplacementText',
      data: 'What',
      dataTransfer,
    })
    // Empty getTargetRanges, mirroring Grammarly in iframe context.
    Object.defineProperty(beforeInput, 'getTargetRanges', {
      value: () => [],
    })

    editorEl.dispatchEvent(beforeInput)

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'What is the problem',
      ])
    })

    // The caret should land right after the inserted replacement.
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      backward: false,
    })
  })
})
