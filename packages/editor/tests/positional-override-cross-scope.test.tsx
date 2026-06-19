import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineContainer,
  defineInlineObject,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Cross-scope behavior — the load-bearing properties of inline scoping
 * via `defineTextBlock.of`.
 *
 *   - Two text blocks side-by-side in the same container can scope
 *     their inline content INDEPENDENTLY.
 *   - Top-level `defineTextBlock({type, of: [...]})` (via NodePlugin)
 *     registers global inline scoping for that text block type — every
 *     text block of this type scopes inlines the same way regardless
 *     of position.
 *   - Position-level `defineTextBlock.of` overrides global
 *     text-block `of` at the position (positional wins type-keyed).
 */

const calloutTwoBlocksSchema = defineSchema({
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

describe('Cross-scope positional override', () => {
  test('11. Two text blocks side-by-side scope independently', async () => {
    // Two separate `defineTextBlock` registrations CAN'T coexist
    // type-keyed (same _type 'block' would collide). Instead, the
    // SAME text block type scopes its inlines via the active text
    // block's resolved `of`. With one text-block render globally,
    // positional inline overrides at each text block instance differ
    // ONLY when the parent container's structure picks different
    // text-block configs by position.
    //
    // This test pins a different property: with one positional
    // text-block config inside the container, only blocks INSIDE that
    // container see the scoped inline override. Blocks at the top
    // level (outside the container) see the global mention render.
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
      render: ({attributes, children}) => (
        <p data-testid="callout-block" {...attributes}>
          {children}
        </p>
      ),
      of: [calloutMention],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutTwoBlocksSchema,
      initialValue: [
        {
          _key: 'b-top',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'top ', marks: []},
            {_key: 'i0', _type: 'mention', username: 'alice'},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b-inside',
              _type: 'block',
              children: [
                {_key: 's1', _type: 'span', text: 'inside ', marks: []},
                {_key: 'i1', _type: 'mention', username: 'bob'},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalMention]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      // Mention inside callout uses the positional render.
      expect(
        calloutEl!.querySelector('[data-testid="mention-in-callout"]'),
      ).not.toEqual(null)
      // The top-level mention is rendered by the GLOBAL render.
      const editor = document.querySelector('[data-slate-editor]')
      const globals = editor!.querySelectorAll('[data-testid="mention-global"]')
      // The top-level block has one mention via global render.
      expect(globals.length).toEqual(1)
    })
  })

  test('12. Top-level defineTextBlock.of applies globally', async () => {
    // A top-level `defineTextBlock({type, of: [...]})` (no container
    // wrapping) registers global inline scoping. Every text block of
    // this type scopes inlines via this `of`, regardless of which
    // container (or root) contains the text block.
    const globalMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-fallback" {...attributes}>
          {children}
        </span>
      ),
    })
    const scopedMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-scoped" {...attributes}>
          {children}
        </span>
      ),
    })
    // Top-level text block with `of` provides global inline scoping.
    const globalBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="global-block" {...attributes}>
          {children}
        </p>
      ),
      of: [scopedMention],
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'mention', fields: [{name: 'username', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hi ', marks: []},
            {_key: 'i0', _type: 'mention', username: 'alice'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      // Both globals registered. The text block's `of` scoped
      // mention should win over the standalone global mention.
      children: <NodePlugin nodes={[globalBlock, globalMention]} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="mention-scoped"]'),
      ).not.toEqual(null)
      expect(
        document.querySelector('[data-testid="mention-fallback"]'),
      ).toEqual(null)
    })
  })

  test('13. Position-level defineTextBlock.of wins over global defineTextBlock.of at that position', async () => {
    const globalScopedMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-global-scoped" {...attributes}>
          {children}
        </span>
      ),
    })
    const positionalScopedMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-positional-scoped" {...attributes}>
          {children}
        </span>
      ),
    })
    const globalBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [globalScopedMention],
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [positionalScopedMention],
    })
    const callout = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </aside>
      ),
      of: [calloutBlock],
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutTwoBlocksSchema,
      initialValue: [
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'hi ', marks: []},
                {_key: 'i0', _type: 'mention', username: 'alice'},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[callout, globalBlock]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(
        calloutEl!.querySelector('[data-testid="mention-positional-scoped"]'),
      ).not.toEqual(null)
      expect(
        calloutEl!.querySelector('[data-testid="mention-global-scoped"]'),
      ).toEqual(null)
    })
  })
})
