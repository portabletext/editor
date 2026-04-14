import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getChildren} from './get-children'

/**
 * Get the first child of a node at a given path.
 */
export function getFirstChild(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): {node: Node; path: Path} | undefined {
  return getChildren(context, path).at(0)
}
