import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
  defineInlineObject,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}, {type: 'video'}],
        },
      ],
    },
    {name: 'image'},
    {name: 'video'},
  ],
})

const mentionSchema = defineSchema({
  inlineObjects: [{name: 'mention'}, {name: 'emoji'}],
})

describe('catch-all registration: global blockObject', () => {
  test('blockObject catch-all catches an unregistered top-level block-object type', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [{_type: 'image', _key: 'k0'}],
      children: (
        <NodePlugin
          nodes={[
            defineBlockObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <div
                  data-testid={`fallback-${node._type}`}
                  data-fallback="block"
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const fallback = document.querySelector('[data-testid="fallback-image"]')
      expect(fallback).not.toEqual(null)
      expect(fallback!.getAttribute('data-fallback')).toEqual('block')
    })
  })

  test('specific-type registration wins over blockObject catch-all', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {_type: 'image', _key: 'k0'},
        {_type: 'video', _key: 'k1'},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineBlockObject({
              type: 'image',
              render: ({attributes, children}) => (
                <div data-testid="specific-image" {...attributes}>
                  {children}
                </div>
              ),
            }),
            defineBlockObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <div data-testid={`fallback-${node._type}`} {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="specific-image"]'),
      ).not.toEqual(null)
      expect(
        document.querySelector('[data-testid="fallback-video"]'),
      ).not.toEqual(null)
      expect(document.querySelector('[data-testid="fallback-image"]')).toEqual(
        null,
      )
    })
  })

  test('blockObject catch-all catches unregistered types inside a registered container', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0'}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
            }),
            defineBlockObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <div data-testid={`fallback-${node._type}`} {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      const fallback = callout!.querySelector('[data-testid="fallback-image"]')
      expect(fallback).not.toEqual(null)
    })
  })
})

describe('catch-all registration: global inlineObject', () => {
  test('inlineObject catch-all catches an unregistered inline-object type', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: mentionSchema,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'Hi ', marks: []},
            {_type: 'mention', _key: 'm0'},
            {_type: 'span', _key: 's1', text: '!', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: 'block',
              render: ({attributes, children}) => (
                <p data-testid="text-block" {...attributes}>
                  {children}
                </p>
              ),
            }),
            defineInlineObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <span
                  data-testid={`fallback-inline-${node._type}`}
                  {...attributes}
                >
                  {children}
                </span>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const fallback = document.querySelector(
        '[data-testid="fallback-inline-mention"]',
      )
      expect(fallback).not.toEqual(null)
    })
  })
})

describe('catch-all registration: global textBlock', () => {
  test('textBlock catch-all renders text blocks inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'hello', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
            }),
            defineTextBlock({
              type: '*',
              render: ({attributes, children, node}) => (
                <p data-testid={`fallback-text-${node._type}`} {...attributes}>
                  {children}
                </p>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      const fallback = callout!.querySelector(
        '[data-testid="fallback-text-block"]',
      )
      expect(fallback).not.toEqual(null)
      expect(fallback!.textContent).toContain('hello')
    })
  })
})

describe('catch-all registration: positional', () => {
  test('positional catch-all inside a container catches unregistered child types', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0'}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
              of: [
                defineBlockObject({
                  type: '*',
                  render: ({attributes, children, node}) => (
                    <div
                      data-testid={`positional-${node._type}`}
                      {...attributes}
                    >
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      const positional = callout!.querySelector(
        '[data-testid="positional-image"]',
      )
      expect(positional).not.toEqual(null)
    })
  })

  test('positional catch-all beats global specific-type registration', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0'}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
              of: [
                defineBlockObject({
                  type: '*',
                  render: ({attributes, children, node}) => (
                    <div
                      data-testid={`positional-${node._type}`}
                      {...attributes}
                    >
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
            defineBlockObject({
              type: 'image',
              render: ({attributes, children}) => (
                <div data-testid="global-image" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-image"]'),
      ).not.toEqual(null)
      expect(callout!.querySelector('[data-testid="global-image"]')).toEqual(
        null,
      )
    })
  })

  test('positional specific-type beats positional catch-all', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {_type: 'image', _key: 'i0'},
            {_type: 'video', _key: 'v0'},
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
              of: [
                defineBlockObject({
                  type: 'image',
                  render: ({attributes, children}) => (
                    <div
                      data-testid="positional-image-specific"
                      {...attributes}
                    >
                      {children}
                    </div>
                  ),
                }),
                defineBlockObject({
                  type: '*',
                  render: ({attributes, children, node}) => (
                    <div
                      data-testid={`positional-fallback-${node._type}`}
                      {...attributes}
                    >
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-image-specific"]'),
      ).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-fallback-video"]'),
      ).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-fallback-image"]'),
      ).toEqual(null)
    })
  })
})

describe('catch-all registration: cross-rung precedence', () => {
  test('positional specific beats global catch-all for the same type', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0'}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
              of: [
                defineBlockObject({
                  type: 'image',
                  render: ({attributes, children}) => (
                    <div data-testid="positional-image" {...attributes}>
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
            defineBlockObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <div
                  data-testid={`global-catch-all-${node._type}`}
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-image"]'),
      ).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="global-catch-all-image"]'),
      ).toEqual(null)
    })
  })

  test('positional specific beats global specific for the same type', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0'}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
              of: [
                defineBlockObject({
                  type: 'image',
                  render: ({attributes, children}) => (
                    <div data-testid="positional-image" {...attributes}>
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
            defineBlockObject({
              type: 'image',
              render: ({attributes, children}) => (
                <div data-testid="global-image" {...attributes}>
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-image"]'),
      ).not.toEqual(null)
      expect(callout!.querySelector('[data-testid="global-image"]')).toEqual(
        null,
      )
    })
  })

  test('all four rungs present: positional specific wins', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0'}],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'callout',
              arrayField: 'content',
              render: ({attributes, childrenAttributes, children}) => (
                <div
                  data-testid="callout"
                  {...attributes}
                  {...childrenAttributes}
                >
                  {children}
                </div>
              ),
              of: [
                defineBlockObject({
                  type: 'image',
                  render: ({attributes, children}) => (
                    <div data-testid="positional-image" {...attributes}>
                      {children}
                    </div>
                  ),
                }),
                defineBlockObject({
                  type: '*',
                  render: ({attributes, children, node}) => (
                    <div
                      data-testid={`positional-catch-all-${node._type}`}
                      {...attributes}
                    >
                      {children}
                    </div>
                  ),
                }),
              ],
            }),
            defineBlockObject({
              type: 'image',
              render: ({attributes, children}) => (
                <div data-testid="global-image" {...attributes}>
                  {children}
                </div>
              ),
            }),
            defineBlockObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <div
                  data-testid={`global-catch-all-${node._type}`}
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const callout = document.querySelector('[data-testid="callout"]')
      expect(callout).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-image"]'),
      ).not.toEqual(null)
      expect(
        callout!.querySelector('[data-testid="positional-catch-all-image"]'),
      ).toEqual(null)
      expect(callout!.querySelector('[data-testid="global-image"]')).toEqual(
        null,
      )
      expect(
        callout!.querySelector('[data-testid="global-catch-all-image"]'),
      ).toEqual(null)
    })
  })
})

const objectAndInlineSchema = defineSchema({
  blockObjects: [{name: 'callout'}],
  inlineObjects: [{name: 'mention'}],
})

describe("catch-all registration: cross-kind coexistence at '*'", () => {
  test('textBlock, blockObject, and inlineObject catch-alls all register and dispatch', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: objectAndInlineSchema,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          style: 'normal',
          children: [
            {_type: 'span', _key: 's0', text: 'Before '},
            {_type: 'mention', _key: 'm0'},
            {_type: 'span', _key: 's1', text: ' after'},
          ],
          markDefs: [],
        },
        {_type: 'callout', _key: 'c0'},
      ],
      children: (
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: '*',
              render: ({attributes, children, node}) => (
                <div data-testid={`tb-${node._type}`} {...attributes}>
                  {children}
                </div>
              ),
            }),
            defineBlockObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <div data-testid={`bo-${node._type}`} {...attributes}>
                  {children}
                </div>
              ),
            }),
            defineInlineObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <span data-testid={`io-${node._type}`} {...attributes}>
                  {children}
                </span>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="tb-block"]')).not.toEqual(
        null,
      )
      expect(document.querySelector('[data-testid="bo-callout"]')).not.toEqual(
        null,
      )
      expect(document.querySelector('[data-testid="io-mention"]')).not.toEqual(
        null,
      )
    })
  })
})
