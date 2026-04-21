import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  styles: [{name: 'h1'}],
  blockObjects: [
    {
      name: 'cell',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'monospace'}],
            },
          ],
        },
      ],
    },
  ],
})

const cellContainer = [
  defineContainer({
    scope: '$..cell',
    field: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('insert.break inside a container with a style override', () => {
  test(`Enter at the end of a text block creates a sibling with the container's default style`, async () => {
    const keyGenerator = createTestKeyGenerator()
    const cellKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'monospace',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={cellContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'monospace',
            },
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: '', marks: []}],
              markDefs: [],
              style: 'monospace',
            },
          ],
        },
      ])
    })
  })

  test(`Enter at the start of a text block creates a sibling above with the container's default style`, async () => {
    const keyGenerator = createTestKeyGenerator()
    const cellKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'monospace',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={cellContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: cellKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _type: 'cell',
          _key: cellKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'monospace',
            },
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: 'hello', marks: []}],
              markDefs: [],
              style: 'monospace',
            },
          ],
        },
      ])
    })
  })
})
