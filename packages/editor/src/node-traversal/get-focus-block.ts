import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {getAncestors} from './get-ancestors'
import {getNode} from './get-node'
import {isBlock} from './is-block'

/**
 * Walk up from the focus path to find the nearest block.
 *
 * Depth-agnostic counterpart to the root-only `getFocusBlock` selector:
 * traverses through containers and returns the first ancestor (or the focus
 * node itself) that is a block, along with its fully-resolved path. Returns
 * `undefined` when the focus is not inside a block.
 */
export function getFocusBlock(
  snapshot: EditorSnapshot,
): {node: PortableTextBlock; path: Path} | undefined {
  const selection = snapshot.context.selection
  if (!selection) {
    return undefined
  }
  const focusPath = selection.focus.path
  const focusNode = getNode(snapshot.context, focusPath)
  if (focusNode && isBlock(snapshot.context, focusNode.path)) {
    return {node: focusNode.node as PortableTextBlock, path: focusNode.path}
  }
  for (const ancestor of getAncestors(snapshot.context, focusPath)) {
    if (isBlock(snapshot.context, ancestor.path)) {
      return {node: ancestor.node as PortableTextBlock, path: ancestor.path}
    }
  }
  return undefined
}
