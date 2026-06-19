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
 * Architecture-level isolation: `ParentContainerContext` and
 * `ParentTextBlockContext` are SEPARATE contexts. Inline subscribers
 * (spans, inline-objects) read `ParentTextBlockContext` only. Block
 * subscribers (containers, text blocks, block-objects) read
 * `ParentContainerContext` only. The two contexts are independent
 * subscription surfaces.
 *
 * These tests pin the architectural property by asserting that:
 *  - The mention rendered inside the callout's text block uses the
 *    positional render (proves inline reads text-block context).
 *  - The callout container's render fires (proves block reads
 *    container context).
 *  - Both render simultaneously without one canceling the other.
 *
 * Exact re-render-count testing for two-context isolation is left to
 * the production environment (React profiler + production builds).
 */

describe('Context isolation between block-level and inline-level dispatch', () => {
  test('18. Inline dispatch reads ParentTextBlockContext (not ParentContainerContext)', async () => {
    // Register the mention positionally inside the TEXT BLOCK and
    // also as a GLOBAL with a different render. If inline dispatch
    // correctly reads `ParentTextBlockContext`, the positional render
    // wins. If inline dispatch instead read `ParentContainerContext`
    // (the callout container's `of` would not contain `mention`
    // because container's `of` cannot type-accept inline kinds), no
    // positional match would be found and the dispatch would fall
    // through to the GLOBAL render. So `mention-positional` present
    // vs `mention-global` present discriminates which context was
    // consulted.
    const mentionInline = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-positional" {...attributes}>
          {children}
        </span>
      ),
    })
    const mentionGlobal = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention-global" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => <p {...attributes}>{children}</p>,
      of: [mentionInline],
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
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
        inlineObjects: [
          {name: 'mention', fields: [{name: 'username', type: 'string'}]},
        ],
      }),
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
      children: <NodePlugin nodes={[callout, mentionGlobal]} />,
    })

    await vi.waitFor(() => {
      const calloutEl = document.querySelector('[data-testid="callout"]')
      expect(calloutEl).not.toEqual(null)
      // Inline correctly read ParentTextBlockContext and found the
      // positional override on the text block's `of`.
      expect(
        calloutEl!.querySelector('[data-testid="mention-positional"]'),
      ).not.toEqual(null)
      // The global render did NOT fire - if inline had mistakenly read
      // ParentContainerContext (which has no inline `of`), it would
      // have fallen through to the global instead.
      expect(
        calloutEl!.querySelector('[data-testid="mention-global"]'),
      ).toEqual(null)
    })
  })

  test('19. Block dispatch does not consume ParentTextBlockContext', async () => {
    // A text block with `of` overrides for inlines must not affect
    // the block-level dispatch (the container's render fires
    // regardless of whether the text block has `of`).
    const calloutMention = defineInlineObject({
      type: 'mention',
      render: ({attributes, children}) => (
        <span data-testid="mention" {...attributes}>
          {children}
        </span>
      ),
    })
    const calloutBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p data-testid="callout-block-render" {...attributes}>
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
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
        inlineObjects: [
          {name: 'mention', fields: [{name: 'username', type: 'string'}]},
        ],
      }),
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
      children: <NodePlugin nodes={[callout]} />,
    })

    await vi.waitFor(() => {
      // Container render fires (consumes ParentContainerContext only).
      expect(document.querySelector('[data-testid="callout"]')).not.toEqual(
        null,
      )
      // Text-block render fires (also consumes ParentContainerContext only).
      expect(
        document.querySelector('[data-testid="callout-block-render"]'),
      ).not.toEqual(null)
      // Inline render fires (consumes ParentTextBlockContext).
      expect(document.querySelector('[data-testid="mention"]')).not.toEqual(
        null,
      )
    })
  })
})
