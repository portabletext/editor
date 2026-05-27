import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the text block node at a given path.
 *
 * @beta
 */
export function getTextBlockNode(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (!isTextBlock({schema: snapshot.context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
