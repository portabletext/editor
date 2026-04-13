import type {PortableTextBlock} from '@portabletext/schema'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {ReactElement} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
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

const calloutRenderers = [
  {
    renderer: {
      type: 'callout' as const,
      render: ({
        attributes,
        children,
      }: {
        attributes: Record<string, unknown>
        children: Record<string, ReactElement>
      }) => (
        <div data-testid="callout" {...attributes}>
          {children['content']}
        </div>
      ),
    },
  },
]

describe('container rendering', () => {
  test('callout renders with the renderer component', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
                  text: 'inside callout',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <RendererPlugin renderers={calloutRenderers} />,
    })

    await vi.waitFor(() => {
      const calloutElement = document.querySelector('[data-testid="callout"]')
      expect(calloutElement).not.toBeNull()
    })
  })

  test('children record maps field names to rendered content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const receivedChildren: Array<Record<string, ReactElement>> = []

    const trackingRenderers = [
      {
        renderer: {
          type: 'callout' as const,
          render: ({
            attributes,
            children,
          }: {
            attributes: Record<string, unknown>
            children: Record<string, ReactElement>
          }) => {
            receivedChildren.push(children)
            return (
              <div data-testid="callout" {...attributes}>
                {children['content']}
              </div>
            )
          },
        },
      },
    ]

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
                  text: 'inside callout',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <RendererPlugin renderers={trackingRenderers} />,
    })

    await vi.waitFor(() => {
      expect(receivedChildren.length).toBeGreaterThan(0)
      const lastChildren = receivedChildren[receivedChildren.length - 1]
      if (lastChildren) {
        expect(Object.keys(lastChildren)).toEqual(['content'])
      }
    })
  })

  test('callout DOM structure contains editable text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
                  text: 'inside callout',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <RendererPlugin renderers={calloutRenderers} />,
    })

    await vi.waitFor(() => {
      const calloutElement = document.querySelector('[data-testid="callout"]')
      expect(calloutElement).not.toBeNull()
      expect(calloutElement?.textContent).toBe('inside callout')
    })
  })

  test('value prop receives the raw node data', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const receivedValues: Array<PortableTextBlock> = []

    const trackingRenderers = [
      {
        renderer: {
          type: 'callout' as const,
          render: ({
            attributes,
            children,
            value,
          }: {
            attributes: Record<string, unknown>
            children: Record<string, ReactElement>
            value: PortableTextBlock
          }) => {
            receivedValues.push(value)
            return (
              <div data-testid="callout" {...attributes}>
                {Object.values(children)}
              </div>
            )
          },
        },
      },
    ]

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
                  text: 'inside callout',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <RendererPlugin renderers={trackingRenderers} />,
    })

    await vi.waitFor(() => {
      expect(receivedValues.length).toBeGreaterThan(0)
      const lastValue = receivedValues[receivedValues.length - 1]
      if (lastValue) {
        expect(lastValue._type).toBe('callout')
        expect(lastValue._key).toBe(calloutKey)
      }
    })
  })
})
