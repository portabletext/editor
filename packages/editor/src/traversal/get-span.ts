import type {PortableTextSpan} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getSpanNode} from '../node-traversal/get-span-node'
import type {Path} from '../slate/interfaces/path'

/**
 * Get the span at the given path.
 *
 * When `at` is omitted, defaults to the focus path of the current selection.
 * Returns undefined if the node at the path is not a span, or if there is no
 * selection and no `at` path provided.
 */
export function getSpan(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextSpan; path: Path} | undefined {
  const path = options?.at ?? snapshot.context.selection?.focus.path

  if (!path) {
    return undefined
  }

  const context = {
    schema: snapshot.context.schema,
    editableTypes: snapshot.context.editableTypes,
    value: snapshot.context.value,
  }

  return getSpanNode(context, path)
}
