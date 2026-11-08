import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/resolve-containers'
import {walkedNode, walkPath} from '../traversal/walk-path'

/**
 * Walk the tree to the node at the given path and return the field
 * name of its child array (e.g. 'children', 'rows', 'cells').
 *
 * Returns undefined for leaf nodes (spans, inline objects) that have no
 * child array.
 */
export function getChildFieldName(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): string | undefined {
  return walkedNode(walkPath({context, blockIndexMap: new Map()}, path))
    ?.children?.fieldName
}
