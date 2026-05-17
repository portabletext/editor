import type {
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'

/**
 * Read the `_type` from a pre-resolved `of` entry.
 */
export function entryType(
  entry:
    | ContainerConfig
    | SpanConfig
    | BlockObjectConfig
    | InlineObjectConfig
    | TextBlockConfig,
): string {
  if ('container' in entry) {
    return entry.container.type
  }
  if ('textBlock' in entry) {
    return entry.textBlock.type
  }
  if ('span' in entry) {
    return entry.span.type
  }
  if ('blockObject' in entry) {
    return entry.blockObject.type
  }
  return entry.inlineObject.type
}
