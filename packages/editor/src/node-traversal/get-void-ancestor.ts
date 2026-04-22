import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {TraversalContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isVoidNode} from '../slate/node/is-void-node'
import {getAncestor} from './get-ancestor'

/**
 * Find the nearest ancestor that is a void (non-editable) object node.
 *
 * Unlike `getAncestorObjectNode`, editable containers are skipped — they are
 * object nodes but contain editable content, so callers that want "this
 * subtree is a single selectable void" should use this instead.
 */
export function getVoidAncestor(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextObject; path: Path} | undefined {
  return getAncestor(context, path, (node, ancestorPath) =>
    isVoidNode(context, node, ancestorPath),
  )
}
