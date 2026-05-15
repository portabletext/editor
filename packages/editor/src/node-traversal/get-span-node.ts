import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {Path} from '../slate/interfaces/path'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the span node at a given path.
 *
 * @beta
 */
export function getSpanNode(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextSpan; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (!isSpan({schema: snapshot.context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
