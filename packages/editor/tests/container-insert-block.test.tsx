import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
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
    scope: '$..callout',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('insert.block inside a container', () => {
  test('placement: after — inserts a sibling block AFTER the focused block inside the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'world'}],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: 'world', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('placement: before — inserts a sibling block BEFORE the focused block inside the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'before'}],
      },
      placement: 'before',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [
                {_type: 'span', _key: 'k6', text: 'before', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('placement: auto, collapsed caret at end of block — merges the inserted text block fragment into the existing one', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'world'}],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'helloworld',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('placement: auto, empty target block — replaces the empty block inside the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'filled'}],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [
                {_type: 'span', _key: 'k6', text: 'filled', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('placement: auto, collapsed caret in middle of text block — splits block and inserts block object between', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image'},
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'image'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'helloworld',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'image',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'image',
              _key: 'k5',
            },
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k6', text: 'world', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})
