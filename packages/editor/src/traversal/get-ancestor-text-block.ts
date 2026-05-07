import type {PortableTextTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {Path} from '../slate/interfaces/path'
import {getAncestor} from './get-ancestor'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Walk up from `path` and return the deepest ancestor that is a text block.
 * Returns `undefined` if no ancestor in the chain is a text block.
 *
 * @beta
 */
export function getAncestorTextBlock(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const result = getAncestor(snapshot, path, (node) =>
    isTextBlock({schema: snapshot.context.schema}, node),
  )
  if (!result) {
    return undefined
  }
  if (!isTextBlock({schema: snapshot.context.schema}, result.node)) {
    return undefined
  }
  return {node: result.node, path: result.path}
}
