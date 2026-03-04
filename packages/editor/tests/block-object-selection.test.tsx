import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

const schema = defineSchema({
  blockObjects: [{name: 'image'}],
})

describe('block object selection', () => {
  test('cutting a selected block object removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'above', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: keyGenerator(),
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'below', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: schema,
    })

    await userEvent.click(locator)
    await new Promise((resolve) => setTimeout(resolve, 100))

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'below'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionBeforeText(editor.getSnapshot().context, 'below'),
      )
    })

    // Backspace from start of "below" selects the image
    await userEvent.keyboard('{Backspace}')
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Cut the selected image
    await userEvent.cut()
    await new Promise((resolve) => setTimeout(resolve, 100))

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'above',
        'below',
      ])
    })
  })

  test('Delete forward from text removes adjacent block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'above', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: keyGenerator(),
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'below', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: schema,
    })

    await userEvent.click(locator)
    await new Promise((resolve) => setTimeout(resolve, 100))

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'above'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'above'),
      )
    })

    // Delete forward from end of "above" removes the image
    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'above',
        'below',
      ])
    })
  })

  test('Backspace from text removes adjacent block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'above', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: keyGenerator(),
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'below', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: schema,
    })

    await userEvent.click(locator)
    await new Promise((resolve) => setTimeout(resolve, 100))

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'below'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionBeforeText(editor.getSnapshot().context, 'below'),
      )
    })

    // Backspace from start of "below" removes the image
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'above',
        'below',
      ])
    })
  })

  test('deleting a block object and typing replaces it with text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'above', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: keyGenerator(),
        },
      ],
      schemaDefinition: schema,
    })

    await userEvent.click(locator)
    await new Promise((resolve) => setTimeout(resolve, 100))

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'above'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'above'),
      )
    })

    // Delete forward removes the image
    await userEvent.keyboard('{Delete}')
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Type replacement text
    await userEvent.type(locator, 'new')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['abovenew'])
    })
  })

  test('block object as only content can be deleted', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: keyGenerator(),
        },
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'b', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      schemaDefinition: schema,
    })

    await userEvent.click(locator)
    await new Promise((resolve) => setTimeout(resolve, 100))

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'b'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'b'),
      )
    })

    // Backspace deletes "b"
    await userEvent.keyboard('{Backspace}')
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Backspace deletes the empty block, selects image
    await userEvent.keyboard('{Backspace}')
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Backspace deletes the image
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })
  })
})
