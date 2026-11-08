import {isTextBlock, type PortableTextObject} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkPath} from './walk-path'

/**
 * Get the annotation at a given path.
 *
 * Annotations live in `markDefs` on a text block, alongside `children`
 * rather than inside it, so they aren't reachable through `getNode`.
 * `getAnnotation` resolves a path of the shape
 * `[..., {_key: block}, 'markDefs', {_key: annotation}, ...]` to the
 * annotation node on the enclosing text block.
 *
 * @public
 */
export function getAnnotation(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextObject; path: Path} | undefined {
  const walk = walkPath(snapshot, path)

  if (walk.status !== 'found') {
    return undefined
  }

  const block = walk.nodes.at(-1)
  const [fieldSegment, annotationSegment] = walk.rest

  if (
    !block ||
    fieldSegment !== 'markDefs' ||
    !isKeyedSegment(annotationSegment) ||
    !isTextBlock({schema: snapshot.context.schema}, block.node)
  ) {
    return undefined
  }

  const annotation = block.node.markDefs?.find(
    (markDef) => markDef._key === annotationSegment._key,
  )

  if (!annotation) {
    return undefined
  }

  return {
    node: annotation,
    path: [...block.path, 'markDefs', {_key: annotation._key}],
  }
}
