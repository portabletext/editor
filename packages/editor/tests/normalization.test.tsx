import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('normalization', () => {
  test('Scenario: spans with the same marks are merged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const spanBazKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong']},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['strong']},
        {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...block.children[0],
              text: 'foobar',
            },
            block.children[2],
          ],
        },
      ])
    })
  })

  test('Scenario: marks equality is order independent', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanFooKey = keyGenerator()
    const spanBarKey = keyGenerator()
    const spanBazKey = keyGenerator()
    const block = {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanFooKey, text: 'foo', marks: ['strong', 'em']},
        {_type: 'span', _key: spanBarKey, text: 'bar', marks: ['em', 'strong']},
        {_type: 'span', _key: spanBazKey, text: 'baz', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [block],
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...block,
          children: [
            {
              ...block.children[0],
              text: 'foobar',
            },
            block.children[2],
          ],
        },
      ])
    })
  })
})
