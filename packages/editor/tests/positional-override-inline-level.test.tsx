import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineContainer,
  defineInlineObject,
  defineSpan,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Inline-level positional override composition.
 *
 * Inline overrides (defineSpan, defineInlineObject) scope under a TEXT
 * BLOCK's `of` array, NOT a container's `of`. The natural parent of
 * an inline child is the text block that owns its `children` field.
 *
 * Same five resolution cases as block-level, but scoped through
 * `defineTextBlock.of` instead of `defineContainer.of`.
 */

const mentionSchema = defineSchema({
  inlineObjects: [
    {name: 'mention', fields: [{name: 'username', type: 'string'}]},
  ],
})

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const calloutMentionSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
  inlineObjects: [
    {name: 'mention', fields: [{name: 'username', type: 'string'}]},
  ],
})

const blockWithMention = () => ({
  _key: 'b0',
  _type: 'block' as const,
  children: [
    {_key: 's0', _type: 'span' as const, text: 'hello ', marks: []},
    {_key: 'i0', _type: 'mention', username: 'alice'},
    {_key: 's1', _type: 'span' as const, text: ' world', marks: []},
  ],
  markDefs: [],
  style: 'normal',
})

const simpleBlock = (text = 'inside') => ({
  _key: 'b0',
  _type: 'block' as const,
  children: [{_key: 's0', _type: 'span' as const, text, marks: []}],
  markDefs: [],
  style: 'normal',
})

const calloutValue = (block: any) => ({
  _key: 'k0',
  _type: 'callout',
  content: [block],
})

describe('Inline-level positional override: defineInlineObject', () => {
  test('1. Global render fires when no positional override exists', async () => {
    const globalMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-global" {...attributes}>
          {children}
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: mentionSchema,
      initialValue: [blockWithMention()],
      children: <NodePlugin nodes={[globalMention]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="mention-global"]'),
      ).not.toEqual(null)
    })
  })

  test('2. Positional render in text-block of overrides global', async () => {
    const globalMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-in-callout" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutMention],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutMentionSchema,
      initialValue: [calloutValue(blockWithMention())],
      children: <NodePlugin nodes={[callout, globalMention]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="mention-in-callout"]'),
      ).not.toEqual(null)
      expect(
        calloutEl!.querySelector('[data-testid="mention-global"]'),
      ).toEqual(null)
    })
  })

  test('3. Positional render: null uses engine default, skipping global', async () => {
    const globalMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutMention = defineInlineObject({type: 'mention', render: null})
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutMention],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutMentionSchema,
      initialValue: [calloutValue(blockWithMention())],
      children: <NodePlugin nodes={[callout, globalMention]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      expect(
        calloutEl!.querySelector('[data-testid="mention-global"]'),
      ).toEqual(null)
      // Engine default for inline-objects emits `data-pt-inline="object"`.
      // Asserting the wrapper is present pins the "use default at this
      // position" branch (vs the resolver silently dropping the
      // override).
      expect(calloutEl!.querySelector('[data-pt-inline="object"]')).not.toEqual(
        null,
      )
    })
  })

  test('4. Positional (no render) falls through to global', async () => {
    const globalMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutMention = defineInlineObject({type: 'mention'})
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutMention],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutMentionSchema,
      initialValue: [calloutValue(blockWithMention())],
      children: <NodePlugin nodes={[callout, globalMention]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="mention-global"]'),
      ).not.toEqual(null)
    })
  })

  test('5. Positional (no render), no global -> engine default', async () => {
    const calloutMention = defineInlineObject({type: 'mention'})
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutMention],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutMentionSchema,
      initialValue: [calloutValue(blockWithMention())],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      expect(
        calloutEl!.querySelector('[data-testid="mention-global"]'),
      ).toEqual(null)
      // Engine default for inline-objects emits `data-pt-inline="object"`.
      expect(calloutEl!.querySelector('[data-pt-inline="object"]')).not.toEqual(
        null,
      )
    })
  })
})

describe('Inline-level positional override: defineSpan', () => {
  test('1. Global render fires when no positional override exists', async () => {
    const globalSpan = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-global" {...attributes}>
          {children}
        </span>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}],
      }),
      initialValue: [simpleBlock()],
      children: <NodePlugin nodes={[globalSpan]} />,
    })

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="span-global"]')).not.toEqual(
        null,
      )
    })
  })

  test('2. Positional render in text-block of overrides global', async () => {
    const globalSpan = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutSpan = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-in-callout" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutSpan],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [calloutValue(simpleBlock())],
      children: <NodePlugin nodes={[callout, globalSpan]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="span-in-callout"]'),
      ).not.toEqual(null)
      expect(calloutEl!.querySelector('[data-testid="span-global"]')).toEqual(
        null,
      )
    })
  })

  test('3. Positional render: null uses engine default, skipping global', async () => {
    const globalSpan = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutSpan = defineSpan({type: 'span', render: null})
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutSpan],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [calloutValue(simpleBlock())],
      children: <NodePlugin nodes={[callout, globalSpan]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      expect(calloutEl!.querySelector('[data-testid="span-global"]')).toEqual(
        null,
      )
      // The positional text-block render fired (the consumer's `<p>`),
      // proving the resolver chain reached down to the inline level.
      // The span fell through to the engine default - a leaf-carrying
      // `<span>` with `data-pt-marks`.
      const blockEl = calloutEl!.querySelector('p')
      expect(blockEl).not.toEqual(null)
      const leafEl = blockEl!.querySelector('[data-pt-marks]')
      expect(leafEl).not.toEqual(null)
      expect(leafEl!.textContent).toContain('inside')
    })
  })

  test('4. Positional (no render) falls through to global', async () => {
    const globalSpan = defineSpan({
      type: 'span',
      render: ({attributes, children}) => (
        <span data-testid="span-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutSpan = defineSpan({type: 'span'})
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutSpan],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [calloutValue(simpleBlock())],
      children: <NodePlugin nodes={[callout, globalSpan]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="span-global"]'),
      ).not.toEqual(null)
    })
  })

  test('5. Positional (no render), no global -> engine default', async () => {
    const calloutSpan = defineSpan({type: 'span'})
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [calloutSpan],
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
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [calloutValue(simpleBlock())],
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      expect(calloutEl!.querySelector('[data-testid="span-global"]')).toEqual(
        null,
      )
      // The positional text-block render fired (the consumer's `<p>`),
      // proving the resolver chain reached down to the inline level.
      // The span fell through to the engine default - a leaf-carrying
      // `<span>` with `data-pt-marks`.
      const blockEl = calloutEl!.querySelector('p')
      expect(blockEl).not.toEqual(null)
      const leafEl = blockEl!.querySelector('[data-pt-marks]')
      expect(leafEl).not.toEqual(null)
      expect(leafEl!.textContent).toContain('inside')
    })
  })
})
