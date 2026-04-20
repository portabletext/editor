import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {isEditableContainer} from '../../schema/is-editable-container'
import type {TraversalContainers} from '../../schema/resolve-containers'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isObjectNode} from './is-object-node'

/**
 * Check if a node is a void (non-editable) object node.
 * Returns true for block objects and inline objects that don't have
 * registered editable content (containers).
 */
export function isVoidNode(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  node: unknown,
  path: Path,
): node is PortableTextObject {
  return (
    isObjectNode({schema: context.schema}, node) &&
    !isEditableContainer(context, node, path)
  )
}
