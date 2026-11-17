import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getNode} from './get-node'
import {isBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the text block at a given path. Returns `undefined` for a text block inside another text block's `children`.
 *
 * @public
 */
export function getTextBlock(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (
    !isBlock(snapshot, entry.path) ||
    !isTextBlock({schema: snapshot.context.schema}, entry.node)
  ) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
