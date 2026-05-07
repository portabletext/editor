import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {getAncestors} from '../traversal/get-ancestors'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

/**
 * Build the scoped type name for a node at a given path.
 *
 * Walks ancestor object nodes from root to parent, collecting type names.
 * For a 'cell' at path [{_key:'t1'}, 'rows', {_key:'r1'}, 'cells', {_key:'c1'}],
 * the ancestors are a 'table' and a 'row', producing: 'table.row.cell'
 */
export function getContainerScopedName(
  snapshot: TraversalSnapshot,
  node: Node,
  path: Path,
): string {
  const ancestors = getAncestors(snapshot, path)

  const typeSegments: Array<string> = []

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i]!
    if (isObjectNode({schema: snapshot.context.schema}, ancestor.node)) {
      typeSegments.push(ancestor.node._type)
    }
  }

  typeSegments.push(node._type)

  return typeSegments.join('.')
}
