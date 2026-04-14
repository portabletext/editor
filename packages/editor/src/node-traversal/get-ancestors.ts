import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNode} from './get-node'

/**
 * Get all ancestors of the node at a given path, from nearest to furthest.
 *
 * For a path like [{_key:'t1'}, 'rows', {_key:'r1'}, 'cells', {_key:'c1'}],
 * the ancestors are (nearest first):
 *   [{_key:'t1'}, 'rows', {_key:'r1'}]
 *   [{_key:'t1'}]
 */
export function getAncestors(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): Array<{node: Node; path: Path}> {
  const keyedIndices: Array<number> = []

  for (let i = 0; i < path.length; i++) {
    if (isKeyedSegment(path[i])) {
      keyedIndices.push(i)
    }
  }

  // Need at least 2 keyed segments to have an ancestor
  // (the last one is the node itself)
  if (keyedIndices.length <= 1) {
    return []
  }

  const ancestors: Array<{node: Node; path: Path}> = []

  for (let i = keyedIndices.length - 2; i >= 0; i--) {
    const endIndex = keyedIndices[i]

    if (endIndex === undefined) {
      continue
    }

    const ancestorPath = path.slice(0, endIndex + 1)
    const entry = getNode(context, ancestorPath)

    if (entry) {
      ancestors.push(entry)
    }
  }

  return ancestors
}
