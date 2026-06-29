import type {PortableTextObject} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getTextBlock} from './get-text-block'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the annotation at a given path.
 *
 * Annotations live in `markDefs` on a text block, alongside `children`
 * rather than inside it, so they aren't reachable through `getNode`.
 * `getAnnotation` resolves a path of the shape
 * `[..., {_key: block}, 'markDefs', {_key: annotation}, ...]` to the
 * annotation node on the enclosing text block.
 *
 * @beta
 */
export function getAnnotation(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextObject; path: Path} | undefined {
  // A path may cross multiple `'markDefs'` segments if a consumer
  // registers a container whose array field is named `markDefs`. Try
  // each position and pick the one whose prefix resolves to a text
  // block.
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i] !== 'markDefs') {
      continue
    }

    const annotationSegment = path[i + 1]

    if (!isKeyedSegment(annotationSegment)) {
      continue
    }

    const block = getTextBlock(snapshot, path.slice(0, i))

    if (!block) {
      continue
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

  return undefined
}
