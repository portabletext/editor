import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {getChildren} from './get-children'

/**
 * True if the node at `path` is an editable container whose only child
 * is an empty text block.
 */
export function isEmptyContainer(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): boolean {
  const children = getChildren(context, path)
  return children.length === 1 && isEmptyTextBlock(context, children[0]!.node)
}
