import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNodeChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get all ancestors of the node at a given path, from nearest to furthest.
 *
 * For a path like [{_key:'t1'}, 'rows', {_key:'r1'}, 'cells', {_key:'c1'}],
 * the ancestors are (nearest first):
 *   [{_key:'t1'}, 'rows', {_key:'r1'}]
 *   [{_key:'t1'}]
 *
 * Walks from root to the target in a single pass collecting each ancestor
 * as it goes.
 */
export function getAncestors(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}> {
  // Collect keyed-segment indices to know where each ancestor's path ends.
  const keyedIndices: Array<number> = []
  for (let i = 0; i < path.length; i++) {
    if (isKeyedSegment(path[i])) {
      keyedIndices.push(i)
    }
  }

  // Need at least 2 keyed segments to have an ancestor (the last is self).
  if (keyedIndices.length <= 1) {
    return []
  }

  const {context, blockIndexMap} = snapshot
  let currentChildren: Array<Node> = context.value
  let isRootLevel = true
  let currentParent:
    | import('../schema/resolve-containers').RegisteredContainer
    | undefined

  const ancestorsByDepth: Array<{node: Node; path: Path}> = []
  const resolvedPath: Path = []

  // Descend once. We walk only as far as the second-to-last keyed segment;
  // the last keyed segment is the target itself, which is not an ancestor.
  const targetKeyedIndex = keyedIndices[keyedIndices.length - 1]!

  let segmentIndex = 0
  while (segmentIndex < targetKeyedIndex) {
    const segment = path[segmentIndex]!

    if (typeof segment === 'string') {
      resolvedPath.push(segment)
      segmentIndex++
      continue
    }

    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      // Production snapshots maintain `blockIndexMap` in lockstep with
      // `context.value` so this fast path always fires. Some test
      // fixtures still pass empty or stale maps, which is the debt this
      // size check is working around - see /specs/snapshot-invariants.md.
      // When the fixtures are aligned, drop the guard and use the map
      // directly.
      if (isRootLevel && blockIndexMap.size === currentChildren.length) {
        const index = blockIndexMap.get(segment._key)
        node =
          index !== undefined
            ? currentChildren[index]
            : currentChildren.find((child) => child._key === segment._key)
      } else {
        node = currentChildren.find((child) => child._key === segment._key)
      }
      resolvedPath.push(segment)
      isRootLevel = false
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
      if (node) {
        resolvedPath.push({_key: node._key})
      }
    } else {
      return []
    }

    if (!node) {
      return []
    }

    // Descend with positional awareness. `getNodeChildren` checks the
    // current parent's `of` for a positional override before falling
    // back to the top-level `containers` map - so same-`_type`
    // registered under different parents with different `field`
    // resolves to the right entry at this position.
    const next = getNodeChildren(context, node, currentParent)
    if (!next) {
      return []
    }

    ancestorsByDepth.push({
      node,
      path: resolvedPath.slice(),
    })

    currentChildren = next.children
    currentParent = next.parent
    segmentIndex++
  }

  // Return nearest-first (reverse of document order at the call site).
  return ancestorsByDepth.reverse()
}
