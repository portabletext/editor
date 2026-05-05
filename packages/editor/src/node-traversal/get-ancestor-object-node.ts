import type {PortableTextObject} from '@portabletext/schema'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getAncestor} from './get-ancestor'
import type {TraversalSnapshot} from './traversal-snapshot'

export function getAncestorObjectNode(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextObject; path: Path} | undefined {
  const result = getAncestor(snapshot, path, (node) =>
    isObjectNode({schema: snapshot.context.schema}, node),
  )
  if (!result) {
    return undefined
  }
  if (!isObjectNode({schema: snapshot.context.schema}, result.node)) {
    return undefined
  }
  return {node: result.node, path: result.path}
}
