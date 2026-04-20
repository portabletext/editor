import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {isVoidNode} from '../slate/node/is-void-node'
import {getAncestors} from './get-ancestors'
import {getNode} from './get-node'
import {isInline} from './is-inline'

/**
 * Walk up from the focus path to find the nearest void block object.
 *
 * Depth-agnostic counterpart to the root-only `getFocusBlockObject` selector:
 * traverses through containers and returns the first ancestor that is a void
 * object node whose parent is not a text block (so void inline objects are
 * excluded). Returns `undefined` when the focus is not inside a void block
 * object.
 */
export function getFocusBlockObject(
  snapshot: EditorSnapshot,
): {node: PortableTextObject; path: Path} | undefined {
  const selection = snapshot.context.selection
  if (!selection) {
    return undefined
  }
  const focusPath = selection.focus.path
  const focusNode = getNode(snapshot.context, focusPath)
  if (
    focusNode &&
    isVoidNode(snapshot.context, focusNode.node, focusNode.path) &&
    !isInline(snapshot.context, focusNode.path)
  ) {
    return {node: focusNode.node, path: focusNode.path}
  }
  for (const ancestor of getAncestors(snapshot.context, focusPath)) {
    if (
      isVoidNode(snapshot.context, ancestor.node, ancestor.path) &&
      !isInline(snapshot.context, ancestor.path)
    ) {
      return {node: ancestor.node, path: ancestor.path}
    }
  }
  return undefined
}
