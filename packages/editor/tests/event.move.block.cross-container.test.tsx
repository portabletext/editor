import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const calloutContainer = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('event.move.block cross-container', () => {
  test('Scenario: Moving a root block to a destination inside a container lands before the destination', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootBlock = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'root', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const callout = {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: innerBlockKey,
          children: [
            {_type: 'span', _key: innerSpanKey, text: 'inner', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    }

    const {editor} = await createTestEditor({
      initialValue: [rootBlock, callout],
      keyGenerator,
      schemaDefinition,
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'move.block',
      at: [{_key: rootBlock._key}],
      to: [{_key: calloutKey}, 'content', {_key: innerBlockKey}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            rootBlock,
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'inner', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Moving a block out of a container to a root destination lands before the destination', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootBlock = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'root', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const callout = {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'block',
          _key: innerBlockKey,
          children: [
            {_type: 'span', _key: innerSpanKey, text: 'inner', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    }
    // Keys allocated AFTER initial value so we can predict the placeholder
    // block + span the empty container gets normalized with.
    const placeholderBlockKey = 'k7'
    const placeholderSpanKey = 'k8'

    const {editor} = await createTestEditor({
      initialValue: [rootBlock, callout],
      keyGenerator,
      schemaDefinition,
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'move.block',
      at: [{_key: calloutKey}, 'content', {_key: innerBlockKey}],
      to: [{_key: rootBlock._key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: innerBlockKey,
          children: [
            {_type: 'span', _key: innerSpanKey, text: 'inner', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        rootBlock,
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: placeholderBlockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: placeholderSpanKey,
                  text: '',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Moving a block between two containers lands before the destination', async () => {
    const keyGenerator = createTestKeyGenerator()
    const callout1Key = keyGenerator()
    const block1Key = keyGenerator()
    const callout2Key = keyGenerator()
    const block2Key = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const callout1 = {
      _type: 'callout',
      _key: callout1Key,
      content: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'a', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    }
    const callout2 = {
      _type: 'callout',
      _key: callout2Key,
      content: [
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'b', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    }
    // Keys allocated AFTER initial value for the placeholder in the
    // now-empty origin container.
    const placeholderBlockKey = 'k8'
    const placeholderSpanKey = 'k9'

    const {editor} = await createTestEditor({
      initialValue: [callout1, callout2],
      keyGenerator,
      schemaDefinition,
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'move.block',
      at: [{_key: callout1Key}, 'content', {_key: block1Key}],
      to: [{_key: callout2Key}, 'content', {_key: block2Key}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: callout1Key,
          content: [
            {
              _type: 'block',
              _key: placeholderBlockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: placeholderSpanKey,
                  text: '',
                  marks: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'callout',
          _key: callout2Key,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [{_type: 'span', _key: span1Key, text: 'a', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: block2Key,
              children: [{_type: 'span', _key: span2Key, text: 'b', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})
