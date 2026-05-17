import type {
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'

/**
 * Block-level positional override lookup. Walks the immediate parent
 * container's `of` array (block-content kinds: container, textBlock,
 * blockObject) for a matching `_type`.
 */
export function findBlockPositionalOverride(
  parentConfig: ContainerConfig | undefined,
  type: string,
): ContainerConfig | TextBlockConfig | BlockObjectConfig | undefined {
  if (!parentConfig?.of) {
    return undefined
  }
  return parentConfig.of.find((entry) => {
    if ('container' in entry) {
      return entry.container.type === type
    }
    if ('textBlock' in entry) {
      return entry.textBlock.type === type
    }
    return entry.blockObject.type === type
  })
}

/**
 * Inline-level positional override lookup. Walks the immediate parent
 * text block's `of` array (inline-content kinds: span, inlineObject)
 * for a matching `_type`.
 */
export function findInlinePositionalOverride(
  parentTextBlock: TextBlockConfig | undefined,
  type: string,
): SpanConfig | InlineObjectConfig | undefined {
  if (!parentTextBlock?.of) {
    return undefined
  }
  return parentTextBlock.of.find((entry) => {
    if ('span' in entry) {
      return entry.span.type === type
    }
    return entry.inlineObject.type === type
  })
}
