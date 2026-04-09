import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getBlock as getBlockEntry} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'

/**
 * Get the nearest block at or above the given path.
 *
 * A block is a node whose parent is not a text block. This function walks up
 * from the given path, checking the node at each ancestor level, and returns
 * the first one that is a block.
 *
 * When `at` is omitted, defaults to the focus path of the current selection.
 * Returns undefined if no block is found, or if there is no selection and no
 * `at` path provided.
 */
export function getBlock(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextBlock; path: Path} | undefined {
  const path = options?.at ?? snapshot.context.selection?.focus.path

  if (!path) {
    return undefined
  }

  const context = {
    schema: snapshot.context.schema,
    editableTypes: snapshot.context.editableTypes,
    value: snapshot.context.value,
  }

  return getBlockEntry(context, path)
}
