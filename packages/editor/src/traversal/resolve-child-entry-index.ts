import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * The index of the child addressed by `childPath`'s last segment within
 * `children` (entries as resolved by `getChildren`). Numeric last
 * segments are literal, bounds-checked indices. Keyed segments resolve
 * through `blockIndexMap` when the path is fully keyed (the map's id
 * space), verified against the entry at the mapped position, with a
 * linear scan fallback for misses, disagreements, and paths the map
 * cannot key, mirroring `getNode`/`getChildren`. Returns `-1` when the
 * child is not found.
 *
 * The map is taken explicitly rather than assumed current: some callers
 * deliberately resolve against pre-operation map state. The engine
 * keeps raw-array siblings of this helper (`resolveChildIndex` in
 * `apply-operation.ts`, `childIndexFromMap` in
 * `transform-block-index-map.ts`) for call sites that hold plain node
 * arrays mid-mutation, where no entries exist.
 */
export function resolveChildEntryIndex(
  blockIndexMap: ReadonlyMap<string, number>,
  children: ReadonlyArray<{node: Node; path: Path}>,
  childPath: Path,
): number {
  const lastSegment = childPath[childPath.length - 1]

  if (typeof lastSegment === 'number') {
    return lastSegment >= 0 && lastSegment < children.length ? lastSegment : -1
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
    const mappedIndex = blockIndexMap.get(serializePath(childPath))
    if (
      mappedIndex !== undefined &&
      children[mappedIndex]?.node._key === lastSegment._key
    ) {
      return mappedIndex
    }
  }

  return children.findIndex((child) => child.node._key === lastSegment._key)
}
