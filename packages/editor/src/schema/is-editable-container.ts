import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getContainerScopedName} from './get-container-scoped-name'
import type {TraversalContainers} from './resolve-containers'

/**
 * Check if a node at the given path is a registered editable container.
 */
export function isEditableContainer(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  node: Node,
  path: Path,
): boolean {
  if (context.containers.size === 0) {
    return false
  }

  const scopedName = getContainerScopedName(context, node, path)
  return context.containers.has(scopedName)
}
