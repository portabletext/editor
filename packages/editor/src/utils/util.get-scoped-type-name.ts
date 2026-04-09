import type {EditorSchema} from '../editor/editor-schema'
import {getNode} from '../node-traversal/get-node'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * Compute the scoped type name for a node at a given path.
 *
 * Walks ancestor nodes from root to parent, collecting their types
 * to build a dot-separated scoped name. For example, a cell node
 * inside a table row produces 'table.row.cell'.
 *
 * Root-level nodes return their bare type name (e.g., 'callout').
 */
export function getScopedTypeName(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  node: {_type: string},
  path: Path,
): string {
  const typeSegments: Array<string> = [node._type]

  // Collect keyed segment indices (each represents a node in the tree).
  const keyedIndices: Array<number> = []
  for (let index = 0; index < path.length; index++) {
    if (isKeyedSegment(path[index])) {
      keyedIndices.push(index)
    }
  }

  // Walk ancestor nodes from root to parent, collecting object node types.
  for (let index = 0; index < keyedIndices.length - 1; index++) {
    const ancestorPath = path.slice(0, keyedIndices[index]! + 1)
    const entry = getNode(context, ancestorPath)

    if (!entry || !isObjectNode({schema: context.schema}, entry.node)) {
      break
    }

    // Insert before the node's own type (which is always last).
    typeSegments.splice(typeSegments.length - 1, 0, entry.node._type)
  }

  return typeSegments.join('.')
}
