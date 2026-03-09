import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

/**
 * A key-based path segment: either a keyed reference or a field name.
 */
export type KeyPathSegment = {_key: string} | string

/**
 * A key-based path that identifies a location in the PT document tree.
 *
 * Examples:
 *   Block:  [{_key: 'b1'}]
 *   Child:  [{_key: 'b1'}, 'children', {_key: 's1'}]
 *   Text:   [{_key: 'b1'}, 'children', {_key: 's1'}, 'text']
 */
export type KeyPath = KeyPathSegment[]

/**
 * Resolves a positional Slate path to a key-based PT path using the tree.
 *
 * For the current two-level tree:
 *   [0]    → [{_key: block._key}]
 *   [0, 1] → [{_key: block._key}, 'children', {_key: child._key}]
 *
 * Returns undefined if the path can't be resolved (e.g., index out of bounds).
 *
 * NOTE: For containers, this will need to use resolveArrayFields from the
 * schema to determine which field to traverse at each level. The current
 * implementation only handles the two-level block/children structure.
 */
export function resolveKeyPath(
  schema: EditorSchema,
  tree: Array<PortableTextBlock>,
  slatePath: number[],
): KeyPath | undefined {
  if (slatePath.length === 0) {
    return undefined
  }

  const blockIdx = slatePath[0]!
  const block = tree[blockIdx]

  if (!block?._key) {
    return undefined
  }

  if (slatePath.length === 1) {
    return [{_key: block._key}]
  }

  if (!isTextBlock({schema}, block)) {
    return undefined
  }

  const childIdx = slatePath[1]!
  const child = block.children[childIdx]

  if (!child?._key) {
    return undefined
  }

  return [{_key: block._key}, 'children', {_key: child._key}]
}
