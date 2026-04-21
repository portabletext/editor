import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {TraversalContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getAncestors} from './get-ancestors'
import {getBlock, isBlock} from './is-block'

/**
 * Walk up from a path to find the nearest enclosing block.
 *
 * Returns the node at the path if it is a block, otherwise the first ancestor
 * that is a block. Works at any depth — inside a container this returns the
 * container-internal block, not the outer container.
 */
export function getEnclosingBlock(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextBlock; path: Path} | undefined {
  const direct = getBlock(context, path)

  if (direct) {
    return direct
  }

  for (const ancestor of getAncestors(context, path)) {
    if (isBlock(context, ancestor.path)) {
      const block = getBlock(context, ancestor.path)

      if (block) {
        return block
      }
    }
  }

  return undefined
}
