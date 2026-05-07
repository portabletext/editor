import type {PortableTextObject} from '@portabletext/schema'
import type {Path} from '../slate/interfaces/path'
import {isVoidNode} from '../slate/node/is-void-node'
import {getAncestor} from './get-ancestor'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Find the nearest ancestor that is a void (non-editable) object node.
 *
 * Unlike `getAncestorObjectNode`, editable containers are skipped — they are
 * object nodes but contain editable content, so callers that want "this
 * subtree is a single selectable void" should use this instead.
 */
export function getVoidAncestor(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextObject; path: Path} | undefined {
  return getAncestor(snapshot, path, (node, ancestorPath) =>
    isVoidNode(snapshot, node, ancestorPath),
  )
}
