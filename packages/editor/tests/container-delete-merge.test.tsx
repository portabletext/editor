import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
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

describe('delete.backward inside a container', () => {
  test('Backspace at start of second block merges adjacent spans with identical marks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: block2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Backspace at start of second block preserves spans with distinct marks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: block2Key,
              children: [
                {
                  _type: 'span',
                  _key: span2Key,
                  text: 'bar',
                  marks: ['strong'],
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

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foo', marks: []},
                {
                  _type: 'span',
                  _key: span2Key,
                  text: 'bar',
                  marks: ['strong'],
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

  test('Backspace with cross-block expanded selection merges surviving spans', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: block2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    await userEvent.click(locator)

    // Select from after "fo" in block1 to after "ba" in block2.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block1Key},
            'children',
            {_key: span1Key},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 2,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'for', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Backspace at start of first block inside container does not merge across container boundary', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootBlockKey = keyGenerator()
    const rootSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: rootBlockKey,
          children: [
            {_type: 'span', _key: rootSpanKey, text: 'outside', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    await userEvent.click(locator)

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

    await userEvent.keyboard('{Backspace}')

    // The callout block and the outside block should both still exist.
    // Backspace at the start of the FIRST block inside a container should
    // not merge across the container boundary.
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toHaveLength(2)
      expect(value![0]).toEqual({
        _type: 'block',
        _key: rootBlockKey,
        children: [
          {_type: 'span', _key: rootSpanKey, text: 'outside', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })
      expect(value![1]).toEqual({
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: innerBlockKey,
            children: [
              {_type: 'span', _key: innerSpanKey, text: 'inside', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })
    })
  })
})

describe('delete.forward inside a container', () => {
  test('Delete at end of first block merges second block into it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: block2Key,
              children: [
                {_type: 'span', _key: span2Key, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block1Key},
            'children',
            {_key: span1Key},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block1Key},
            'children',
            {_key: span1Key},
          ],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {_type: 'span', _key: span1Key, text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Delete at end of last block inside container does not merge across container boundary', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const rootBlockKey = keyGenerator()
    const rootSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
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
                {_type: 'span', _key: innerSpanKey, text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: rootBlockKey,
          children: [
            {_type: 'span', _key: rootSpanKey, text: 'outside', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
    })

    await userEvent.click(locator)

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
          offset: 6,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 6,
        },
      },
    })

    await userEvent.keyboard('{Delete}')

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
                {_type: 'span', _key: innerSpanKey, text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: rootBlockKey,
          children: [
            {_type: 'span', _key: rootSpanKey, text: 'outside', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
