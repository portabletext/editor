import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {getAncestors} from './get-ancestors'
import {getNode} from './get-node'
import {isBlock} from './is-block'

/**
 * Walk up from the anchor path to find the nearest block.
 *
 * Depth-agnostic counterpart to the root-only `getAnchorBlock` selector:
 * traverses through containers and returns the first ancestor (or the anchor
 * node itself) that is a block, along with its fully-resolved path.
 */
export function getAnchorBlock(
  snapshot: EditorSnapshot,
): {node: PortableTextBlock; path: Path} | undefined {
  const selection = snapshot.context.selection
  if (!selection) {
    return undefined
  }
  const anchorPath = selection.anchor.path
  const anchorNode = getNode(snapshot.context, anchorPath)
  if (anchorNode && isBlock(snapshot.context, anchorNode.path)) {
    return {node: anchorNode.node as PortableTextBlock, path: anchorNode.path}
  }
  for (const ancestor of getAncestors(snapshot.context, anchorPath)) {
    if (isBlock(snapshot.context, ancestor.path)) {
      return {node: ancestor.node as PortableTextBlock, path: ancestor.path}
    }
  }
  return undefined
}
