import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import type {RegisteredContainer} from '../schema/resolve-containers'
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
 *
 * Every ancestor is a `PortableTextBlock`: only text blocks and object
 * nodes can contain children.
 *
 * @beta
 */
export function getAncestors(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: PortableTextBlock; path: Path}> {
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
  let currentParent: RegisteredContainer | undefined

  const ancestorsByDepth: Array<{node: PortableTextBlock; path: Path}> = []
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
      resolvedPath.push(segment)
      const index = blockIndexMap.get(serializePath(resolvedPath))
      if (
        index !== undefined &&
        currentChildren[index]?._key === segment._key
      ) {
        node = currentChildren[index]
      } else {
        // The map can miss (unkeyed transient nodes, e.g. `{_type:'table'}`
        // inserted by a remote patch before normalize mints a key) or
        // disagree with the traversed value (snapshots that pair the live
        // map with a pre-apply value, e.g. `textPatch`). Fall back to a
        // linear scan in both cases.
        node = currentChildren.find((child) => child._key === segment._key)
        if (node && node._key !== undefined) {
          resolvedPath[resolvedPath.length - 1] = {_key: node._key}
        }
      }
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

    // An ancestor has children, so it is never a span. The narrowing
    // from `Node` to `PortableTextBlock` (text block | object) is safe.
    ancestorsByDepth.push({
      node: node as PortableTextBlock,
      path: resolvedPath.slice(),
    })

    currentChildren = next.children
    currentParent = next.parent
    segmentIndex++
  }

  // Return nearest-first (reverse of document order at the call site).
  return ancestorsByDepth.reverse()
}
