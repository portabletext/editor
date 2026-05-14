import type {
  ContainerConfig,
  LeafConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'

/**
 * Read the `_type` from a pre-resolved `of` entry.
 */
export function entryType(
  entry: ContainerConfig | LeafConfig | TextBlockConfig,
): string {
  if ('container' in entry) {
    return entry.container.type
  }
  if ('textBlock' in entry) {
    return entry.textBlock.type
  }
  return entry.leaf.type
}
