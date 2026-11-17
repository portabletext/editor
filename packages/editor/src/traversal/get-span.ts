import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getNode} from './get-node'
import {isInline} from './is-inline'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the span at a given path. Returns `undefined` for a span outside a text block's `children`.
 *
 * @public
 */
export function getSpan(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextSpan; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (
    !isInline(snapshot, entry.path) ||
    !isSpan({schema: snapshot.context.schema}, entry.node)
  ) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
