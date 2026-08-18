import type {
  AnnotationConfig,
  BlockObjectConfig,
  ContainerConfig,
  DecoratorConfig,
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
  const specific = parentConfig.of.find((entry) => {
    if ('container' in entry) {
      return entry.container.type === type
    }
    if ('textBlock' in entry) {
      return entry.textBlock.type === type
    }
    return entry.blockObject.type === type
  })
  if (specific) {
    return specific
  }
  // Catch-all fallback. Containers are not eligible for `'*'`.
  return parentConfig.of.find((entry) => {
    if ('container' in entry) {
      return false
    }
    if ('textBlock' in entry) {
      return entry.textBlock.type === '*'
    }
    return entry.blockObject.type === '*'
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
  const specific = parentTextBlock.of.find((entry) =>
    isMatchingSpanOrInlineObject(entry, type),
  )
  if (specific) {
    return specific
  }
  return parentTextBlock.of.find((entry) =>
    isMatchingSpanOrInlineObject(entry, '*'),
  )
}

function isMatchingSpanOrInlineObject(
  entry: SpanConfig | InlineObjectConfig | DecoratorConfig | AnnotationConfig,
  type: string,
): entry is SpanConfig | InlineObjectConfig {
  if ('span' in entry) {
    return entry.span.type === type
  }
  if ('inlineObject' in entry) {
    return entry.inlineObject.type === type
  }
  return false
}

/**
 * Decorator positional override lookup. Walks the immediate parent
 * text block's `of` array (decorator kind) for a matching decorator
 * name: exact first, then a `'*'` entry.
 */
export function findPositionalDecoratorOverride(
  parentTextBlock: TextBlockConfig | undefined,
  decorator: string,
): DecoratorConfig | undefined {
  if (!parentTextBlock?.of) {
    return undefined
  }
  const specific = parentTextBlock.of.find((entry) =>
    isMatchingDecorator(entry, decorator),
  )
  if (specific) {
    return specific
  }
  return parentTextBlock.of.find((entry) => isMatchingDecorator(entry, '*'))
}

function isMatchingDecorator(
  entry: SpanConfig | InlineObjectConfig | DecoratorConfig | AnnotationConfig,
  decorator: string,
): entry is DecoratorConfig {
  return 'decorator' in entry && entry.decorator.type === decorator
}

/**
 * Annotation positional override lookup. Walks the immediate parent
 * text block's `of` array (annotation kind) for a matching annotation
 * `_type`: exact first, then a `'*'` entry.
 */
export function findPositionalAnnotationOverride(
  parentTextBlock: TextBlockConfig | undefined,
  type: string,
): AnnotationConfig | undefined {
  if (!parentTextBlock?.of) {
    return undefined
  }
  const specific = parentTextBlock.of.find((entry) =>
    isMatchingAnnotation(entry, type),
  )
  if (specific) {
    return specific
  }
  return parentTextBlock.of.find((entry) => isMatchingAnnotation(entry, '*'))
}

function isMatchingAnnotation(
  entry: SpanConfig | InlineObjectConfig | DecoratorConfig | AnnotationConfig,
  type: string,
): entry is AnnotationConfig {
  return 'annotation' in entry && entry.annotation.type === type
}
