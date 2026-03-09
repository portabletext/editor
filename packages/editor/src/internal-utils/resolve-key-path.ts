import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'

export type KeyPathSegment = {_key: string} | string

export type KeyPath = KeyPathSegment[]

/**
 * Converts a positional Slate path to a key-based PT path using the tree.
 *
 * Returns undefined if the path can't be resolved.
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
