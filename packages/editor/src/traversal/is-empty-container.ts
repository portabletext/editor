import type {Path} from '../slate/interfaces/path'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {getChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * True if the node at `path` is an editable container whose only child
 * is an empty text block.
 *
 * @beta
 */
export function isEmptyContainer(
  snapshot: TraversalSnapshot,
  path: Path,
): boolean {
  const children = getChildren(snapshot, path)
  return (
    children.length === 1 &&
    isEmptyTextBlock(snapshot.context, children[0]!.node)
  )
}
