import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

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
})
