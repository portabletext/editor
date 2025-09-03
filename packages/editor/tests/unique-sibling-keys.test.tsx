import {defineSchema, isTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {getTextSelection} from '../src/internal-utils/text-selection'

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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
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
      const block = editorRef.current!.getSnapshot().context.value.at(0)!

      if (!isTextBlock(editorRef.current!.getSnapshot().context, block)) {
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
    const {editorRef} = await createTestEditor({
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

    editorRef.current?.send({
      type: 'select',
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'bar'),
    })

    editorRef.current?.send({
      type: 'annotation.add',
      annotation: {
        name: 'link',
        value: {
          href: 'https://sanity.io',
        },
      },
    })

    await vi.waitFor(() => {
      const block = editorRef.current!.getSnapshot().context.value.at(0)!

      if (!isTextBlock(editorRef.current!.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      const childKeys = block.children.map((child) => child._key)

      expect(new Set(childKeys).size).toBe(3)
    })
  })
})
