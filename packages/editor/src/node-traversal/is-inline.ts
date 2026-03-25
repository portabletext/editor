import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {isBlock} from './is-block'

/**
 * Determine if a node at the given path is inline.
 *
 * A node is inline if its parent is a text block. This is the inverse of
 * `isBlock`. Top-level nodes are never inline.
 */
export function isInline(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): boolean {
  return !isBlock(context, path)
}
