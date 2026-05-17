import {expectTypeOf, test} from 'vitest'
import {
  defineBlockObject,
  defineContainer,
  defineInlineObject,
  defineSpan,
  defineTextBlock,
} from '../src/renderers/renderer.types'

/**
 * Negative type-level pinning. Misplacement of a kind in the wrong
 * positional `of` is a type error.
 *
 *   - defineContainer.of accepts only Container | TextBlock |
 *     BlockObject. Span and InlineObject are inline-only and belong
 *     in defineTextBlock.of.
 *   - defineTextBlock.of accepts only Span | InlineObject. Container,
 *     TextBlock, and BlockObject are block-content kinds.
 *
 * These tests use `@ts-expect-error` to pin compile-time
 * forbidden combinations. The expectation is that compilation fails
 * at the marked line; if it passes (compiler accepts the
 * misplacement), `@ts-expect-error` itself errors.
 */

test('14. defineContainer.of containing Span is a type error', () => {
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    of: [
      // @ts-expect-error -- Span belongs in defineTextBlock.of, not container.of
      defineSpan({type: 'span'}),
    ],
  })
})

test('15. defineContainer.of containing InlineObject is a type error', () => {
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    of: [
      // @ts-expect-error -- InlineObject belongs in defineTextBlock.of
      defineInlineObject({type: 'mention'}),
    ],
  })
})

test('16. defineTextBlock.of containing Container is a type error', () => {
  defineTextBlock({
    type: 'block',
    of: [
      // @ts-expect-error -- Container is block-content; defineTextBlock.of accepts inline only
      defineContainer({type: 'inner', arrayField: 'cells'}),
    ],
  })
})

test('17. defineTextBlock.of containing BlockObject is a type error', () => {
  defineTextBlock({
    type: 'block',
    of: [
      // @ts-expect-error -- BlockObject is block-content; defineTextBlock.of accepts inline only
      defineBlockObject({type: 'image'}),
    ],
  })
})

// Type assertions that the resolved `of` shapes are narrowed
// correctly.
test('Container.of resolves to a block-only array type', () => {
  const callout = defineContainer({
    type: 'callout',
    arrayField: 'content',
    of: [defineTextBlock({type: 'block'})],
  })
  type OfEntry = NonNullable<typeof callout.of>[number]
  // Should NOT include Span or InlineObject branches.
  expectTypeOf<OfEntry>().not.toMatchTypeOf<{kind: 'span'}>()
  expectTypeOf<OfEntry>().not.toMatchTypeOf<{kind: 'inlineObject'}>()
})

test('TextBlock.of resolves to an inline-only array type', () => {
  const block = defineTextBlock({
    type: 'block',
    of: [defineSpan({type: 'span'})],
  })
  type OfEntry = NonNullable<typeof block.of>[number]
  expectTypeOf<OfEntry>().not.toMatchTypeOf<{kind: 'container'}>()
  expectTypeOf<OfEntry>().not.toMatchTypeOf<{kind: 'textBlock'}>()
  expectTypeOf<OfEntry>().not.toMatchTypeOf<{kind: 'blockObject'}>()
})
