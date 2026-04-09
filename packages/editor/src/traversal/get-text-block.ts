import type {PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import type {Path} from '../slate/interfaces/path'

/**
 * Get the nearest text block at or above the given path.
 *
 * When `at` is omitted, defaults to the focus path of the current selection.
 * Returns undefined if no text block is found, or if there is no selection
 * and no `at` path provided.
 */
export function getTextBlock(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextTextBlock; path: Path} | undefined {
  const path = options?.at ?? snapshot.context.selection?.focus.path

  if (!path) {
    return undefined
  }

  const context = {
    schema: snapshot.context.schema,
    editableTypes: snapshot.context.editableTypes,
    value: snapshot.context.value,
  }

  return getTextBlockNode(context, path) ?? getAncestorTextBlock(context, path)
}
