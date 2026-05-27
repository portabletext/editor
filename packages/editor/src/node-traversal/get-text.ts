import {isSpan} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getNode} from './get-node'
import {getNodes} from './get-nodes'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the concatenated text content of the node at a given path.
 *
 * @beta
 */
export function getText(
  snapshot: TraversalSnapshot,
  path: Path,
): string | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (isSpan({schema: snapshot.context.schema}, entry.node)) {
    return entry.node.text
  }

  let text = ''

  for (const descendant of getNodes(snapshot, {at: path})) {
    if (isSpan({schema: snapshot.context.schema}, descendant.node)) {
      text += descendant.node.text
    }
  }

  return text
}
