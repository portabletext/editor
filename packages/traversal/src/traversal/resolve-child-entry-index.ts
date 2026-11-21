import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkPath} from './walk-path'

/**
 * The index of the child at `childPath` within `children`, or `-1` if
 * there is none.
 *
 * A numeric last segment is an index into the raw array, which can hold
 * non-object entries that `children` leaves out. The path is walked and the
 * node found is mapped back into `children`. A keyed last segment uses
 * `blockIndexMap` when every segment before it is keyed, checks the entry at
 * the mapped index, and falls back to a linear scan.
 *
 * Callers pass the snapshot rather than reading a live one, because some
 * resolve against the map as it was before an operation.
 */
export function resolveChildEntryIndex(
  snapshot: TraversalSnapshot,
  children: ReadonlyArray<{node: Node; path: Path}>,
  childPath: Path,
): number {
  const lastSegment = childPath[childPath.length - 1]

  if (typeof lastSegment === 'number') {
    if (lastSegment < 0) {
      return -1
    }
    const walk = walkPath(snapshot, childPath)
    const node = walk.status === 'found' ? walk.nodes.at(-1) : undefined
    if (!node) {
      return -1
    }
    return children.length === node.siblings.length
      ? node.index
      : children.findIndex((entry) => entry.node === node.node)
  }

  if (!isKeyedSegment(lastSegment)) {
    return -1
  }

  let fullyKeyed = true
  for (
    let segmentIndex = 0;
    segmentIndex < childPath.length - 1;
    segmentIndex++
  ) {
    const segment = childPath[segmentIndex]
    if (typeof segment !== 'string' && !isKeyedSegment(segment)) {
      fullyKeyed = false
      break
    }
  }

  if (fullyKeyed) {
    const mappedIndex = snapshot.blockIndexMap?.get(serializePath(childPath))
    if (
      mappedIndex !== undefined &&
      children[mappedIndex]?.node._key === lastSegment._key
    ) {
      return mappedIndex
    }
  }

  return children.findIndex((child) => child.node._key === lastSegment._key)
}
