import {defineSchema, isTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

/**
 * At all times, these `_key`s should be unique:
 * - block `_key`s
 * - span `_key`s in individual blocks
 * - markDef `_key`s in individual blocks
 */
describe('unique sibling `_key`s', () => {
  test('splitting span with a decorator', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
        },
      ],
    })

    editor.send({
      type: 'decorator.toggle',
      decorator: 'strong',
      at: {
        anchor: {
          path: [{_key: blockKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}],
          offset: 7,
        },
      },
    })

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value.at(0)!

      if (!isTextBlock(editor.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      const childKeys = block.children.map((child) => child._key)

      expect(new Set(childKeys).size).toBe(3)
    })
  })

  test('splitting span with an annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getTextSelection(editor.getSnapshot().context, 'bar'),
    })

    editor.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        value: {
          href: 'https://sanity.io',
        },
      },
    })

    await vi.waitFor(() => {
      const block = editor.getSnapshot().context.value.at(0)!

      if (!isTextBlock(editor.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      const childKeys = block.children.map((child) => child._key)

      expect(new Set(childKeys).size).toBe(3)
    })
  })

  test('splitting a block with Enter', async () => {
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
            {_type: 'span', _key: spanKey, text: 'foo bar', marks: []},
          ],
        },
      ],
    })

    await userEvent.click(locator)

    const selection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo ', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('merging blocks with Backspace', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKeyA = keyGenerator()
    const spanKey = keyGenerator()
    const blockKeyB = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKeyA,
          children: [{_type: 'span', _key: spanKey, text: 'foo ', marks: []}],
        },
        {
          _type: 'block',
          _key: blockKeyB,
          children: [
            {_type: 'span', _key: spanKey, text: 'bar', marks: ['strong']},
          ],
        },
      ],
    })

    await userEvent.click(locator)

    const selection = {
      anchor: {
        path: [{_key: blockKeyB}, 'children', {_key: spanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKeyB}, 'children', {_key: spanKey}],
        offset: 0,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKeyA,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo ', marks: []},
            {_type: 'span', _key: 'k5', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('splitting and merging annotated block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar', marks: [linkKey]},
          ],
          markDefs: [
            {
              _type: 'link',
              _key: linkKey,
              href: 'https://sanity.io',
            },
          ],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    const selection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: selection,
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo ', marks: [linkKey]},
          ],
          markDefs: [{_key: linkKey, _type: 'link', href: 'https://sanity.io'}],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k5',
          children: [
            {_type: 'span', _key: spanKey, text: 'bar', marks: [linkKey]},
          ],
          markDefs: [{_key: linkKey, _type: 'link', href: 'https://sanity.io'}],
          style: 'normal',
        },
      ])
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo ', marks: [linkKey]},
            {_type: 'span', _key: 'k7', text: 'bar', marks: ['k6']},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://sanity.io'},
            {_key: 'k6', _type: 'link', href: 'https://sanity.io'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('moving a block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKeyA = keyGenerator()
    const spanKeyA = keyGenerator()
    const blockKeyB = keyGenerator()
    const spanKeyB = keyGenerator()
    const blockKeyC = keyGenerator()
    const spanKeyC = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKeyA,
          children: [{_type: 'span', _key: spanKeyA, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockKeyB,
          children: [{_type: 'span', _key: spanKeyB, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockKeyC,
          children: [{_type: 'span', _key: spanKeyC, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'move.block down',
      at: [{_key: blockKeyA}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKeyB,
          children: [{_type: 'span', _key: spanKeyB, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockKeyA,
          children: [{_type: 'span', _key: spanKeyA, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockKeyC,
          children: [{_type: 'span', _key: spanKeyC, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
