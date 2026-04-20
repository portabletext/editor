import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {getAncestor} from './get-ancestor'
import {getNode} from './get-node'

/**
 * Walk up from the focus path to find the nearest text block.
 *
 * Depth-agnostic counterpart to the root-only `getFocusTextBlock` selector:
 * traverses through containers and returns the first ancestor that is a text
 * block, along with its fully-resolved path. Returns `undefined` when the
 * focus is not inside a text block.
 */
export function getFocusTextBlock(
  snapshot: EditorSnapshot,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const selection = snapshot.context.selection
  if (!selection) {
    return undefined
  }
  const focusPath = selection.focus.path
  const focusNode = getNode(snapshot.context, focusPath)
  if (focusNode && isTextBlock(snapshot.context, focusNode.node)) {
    return {node: focusNode.node, path: focusNode.path}
  }
  const ancestor = getAncestor(snapshot.context, focusPath, (node) =>
    isTextBlock(snapshot.context, node),
  )
  if (ancestor && isTextBlock(snapshot.context, ancestor.node)) {
    return {node: ancestor.node, path: ancestor.path}
  }
  return undefined
}
