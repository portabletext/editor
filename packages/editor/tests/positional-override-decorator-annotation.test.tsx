import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {BlockDecoratorRenderProps, PortableTextObject} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineAnnotation,
  defineContainer,
  defineDecorator,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Positional decorator/annotation override composition.
 *
 * `defineTextBlock.of` accepts `Decorator | Annotation` entries, the
 * same precedence ladder as inline/block-level positional overrides:
 *
 *   1. Positional exact (`type` matches the mark) beats everything.
 *   2. Positional `'*'` beats a global exact registration.
 *   3. Global exact beats a global `'*'`.
 *   4. Global `'*'` beats the legacy `renderDecorator`/
 *      `renderAnnotation` render props.
 *   5. A positional entry with no `render` falls through to the
 *      global layer for that mark, ignoring a sibling positional
 *      `'*'`; it does not silence it for other marks.
 */

const calloutDecoratorSchema = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const calloutAnnotationSchema = defineSchema({
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

describe('positional overrides', () => {
  test('positional decorator override wins over global inside the parent; global still fires outside', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outsideBlockKey = keyGenerator()
    const outsideSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()

    const globalStrong = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="global-strong">{children}</strong>
      ),
    })
    const positionalStrong = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <mark data-testid="positional-strong">{children}</mark>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalStrong],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutDecoratorSchema,
      initialValue: [
        markedBlock(outsideBlockKey, outsideSpanKey, 'foo', 'strong'),
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            markedBlock(insideBlockKey, insideSpanKey, 'bar', 'strong'),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalStrong]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="positional-strong"]')
          ?.textContent,
      ).toEqual('bar')
      expect(calloutEl!.querySelector('[data-testid="global-strong"]')).toEqual(
        null,
      )
    })

    expect(
      document.querySelector('[data-testid="global-strong"]')?.textContent,
    ).toEqual('foo')
  })

  test('positional decorator with render: undefined falls through to the global render', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()

    const globalStrong = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="global-strong">{children}</strong>
      ),
    })
    const positionalStrong = defineDecorator({type: 'strong'})
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalStrong],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutDecoratorSchema,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            markedBlock(insideBlockKey, insideSpanKey, 'bar', 'strong'),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalStrong]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="global-strong"]')?.textContent,
      ).toEqual('bar')
    })
  })

  test("positional '*' decorator beats global exact", async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()

    const globalStrong = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="global-strong">{children}</strong>
      ),
    })
    const positionalWildcard = defineDecorator({
      type: '*',
      render: ({children}) => (
        <mark data-testid="positional-wildcard">{children}</mark>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalWildcard],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutDecoratorSchema,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            markedBlock(insideBlockKey, insideSpanKey, 'bar', 'strong'),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalStrong]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="positional-wildcard"]')
          ?.textContent,
      ).toEqual('bar')
      expect(calloutEl!.querySelector('[data-testid="global-strong"]')).toEqual(
        null,
      )
    })
  })

  test('positional annotation override wins inside the parent, receives the markDef as `annotation`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const outsideBlockKey = keyGenerator()
    const outsideSpanKey = keyGenerator()
    const outsideLinkKey = keyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()
    const insideLinkKey = keyGenerator()

    let receivedNode: PortableTextObject | undefined

    const globalLink = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) => (
        <a
          data-testid="global-link"
          href={(annotation as {href?: string}).href}
        >
          {children}
        </a>
      ),
    })
    const positionalLink = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) => {
        receivedNode = annotation
        return (
          <a
            data-testid="positional-link"
            href={(annotation as {href?: string}).href}
          >
            {children}
          </a>
        )
      },
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalLink],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutAnnotationSchema,
      initialValue: [
        linkedBlock(
          outsideBlockKey,
          outsideSpanKey,
          'foo',
          outsideLinkKey,
          'https://example.com/outside',
        ),
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            linkedBlock(
              insideBlockKey,
              insideSpanKey,
              'bar',
              insideLinkKey,
              'https://example.com/inside',
            ),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalLink]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="positional-link"]')
          ?.textContent,
      ).toEqual('bar')
      expect(calloutEl!.querySelector('[data-testid="global-link"]')).toEqual(
        null,
      )
    })

    expect(
      document.querySelector('[data-testid="global-link"]')?.textContent,
    ).toEqual('foo')
    expect(receivedNode).toEqual({
      _key: insideLinkKey,
      _type: 'link',
      href: 'https://example.com/inside',
    })
  })

  test('positional annotation with render: undefined falls through to the global render', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()
    const insideLinkKey = keyGenerator()

    const globalLink = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) => (
        <a
          data-testid="global-link"
          href={(annotation as {href?: string}).href}
        >
          {children}
        </a>
      ),
    })
    const positionalLink = defineAnnotation({type: 'link'})
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalLink],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutAnnotationSchema,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            linkedBlock(
              insideBlockKey,
              insideSpanKey,
              'bar',
              insideLinkKey,
              'https://example.com/inside',
            ),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalLink]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="global-link"]')?.textContent,
      ).toEqual('bar')
    })
  })

  test("positional '*' annotation beats global exact", async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()
    const insideLinkKey = keyGenerator()

    const globalLink = defineAnnotation({
      type: 'link',
      render: ({annotation, children}) => (
        <a
          data-testid="global-link"
          href={(annotation as {href?: string}).href}
        >
          {children}
        </a>
      ),
    })
    const positionalWildcard = defineAnnotation({
      type: '*',
      render: ({children}) => (
        <mark data-testid="positional-wildcard">{children}</mark>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalWildcard],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutAnnotationSchema,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            linkedBlock(
              insideBlockKey,
              insideSpanKey,
              'bar',
              insideLinkKey,
              'https://example.com/inside',
            ),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalLink]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="positional-wildcard"]')
          ?.textContent,
      ).toEqual('bar')
      expect(calloutEl!.querySelector('[data-testid="global-link"]')).toEqual(
        null,
      )
    })
  })

  test('positional exact decorator with render: undefined falls through to global, ignoring a sibling positional wildcard', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()

    const globalStrong = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <strong data-testid="global-strong">{children}</strong>
      ),
    })
    const positionalStrong = defineDecorator({type: 'strong'})
    const positionalWildcard = defineDecorator({
      type: '*',
      render: ({children}) => (
        <mark data-testid="positional-wildcard">{children}</mark>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalStrong, positionalWildcard],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutDecoratorSchema,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            markedBlock(insideBlockKey, insideSpanKey, 'bar', 'strong'),
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalStrong]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="global-strong"]')?.textContent,
      ).toEqual('bar')
      expect(
        calloutEl!.querySelector('[data-testid="positional-wildcard"]'),
      ).toEqual(null)
    })
  })

  test('positional decorator beats renderDecorator prop when no global registration exists', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const insideBlockKey = keyGenerator()
    const insideSpanKey = keyGenerator()

    const positionalStrong = defineDecorator({
      type: 'strong',
      render: ({children}) => (
        <mark data-testid="positional-strong">{children}</mark>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      of: [positionalStrong],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside data-testid="callout" {...attributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    const renderDecorator = vi.fn((props: BlockDecoratorRenderProps) => (
      <span data-testid="legacy-strong">{props.children}</span>
    ))

    await createTestEditor({
      keyGenerator,
      schemaDefinition: calloutDecoratorSchema,
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            markedBlock(insideBlockKey, insideSpanKey, 'bar', 'strong'),
          ],
        },
      ],
      editableProps: {renderDecorator},
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="positional-strong"]')
          ?.textContent,
      ).toEqual('bar')
    })

    expect(renderDecorator).not.toHaveBeenCalled()
  })
})

function markedBlock(
  blockKey: string,
  spanKey: string,
  text: string,
  mark: string,
) {
  return {
    _key: blockKey,
    _type: 'block' as const,
    children: [{_key: spanKey, _type: 'span' as const, text, marks: [mark]}],
    markDefs: [],
    style: 'normal',
  }
}

function linkedBlock(
  blockKey: string,
  spanKey: string,
  text: string,
  linkKey: string,
  href: string,
) {
  return {
    _key: blockKey,
    _type: 'block' as const,
    children: [{_key: spanKey, _type: 'span' as const, text, marks: [linkKey]}],
    markDefs: [{_key: linkKey, _type: 'link' as const, href}],
    style: 'normal',
  }
}
