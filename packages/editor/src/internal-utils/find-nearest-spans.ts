import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import {getChildren} from '../traversal/get-children'
import {getNodes} from '../traversal/get-nodes'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

export type SpanEntry = {
  node: PortableTextSpan
  path: Path
}

/**
 * Find the spans nearest to `path` in document order: the last span
 * strictly before it (`previousSpan`) and the first span strictly after
 * it (`nextSpan`). `path` itself is never returned, but its descendants
 * come after it in document order, so they are `nextSpan` candidates.
 *
 * Anchored replacement for scanning the whole document with `getNodes`
 * from the start: walks outward from `path` level by level (siblings
 * through `getChildren`, the position within them through
 * `blockIndexMap`), descending only into sibling subtrees between
 * `path` and the answer. Equivalence with the document scan is pinned
 * by the oracle test in `find-nearest-spans.test.ts`.
 */
export function findNearestSpans(
  snapshot: TraversalSnapshot,
  path: Path,
): {
  previousSpan: SpanEntry | undefined
  nextSpan: SpanEntry | undefined
} {
  return {
    previousSpan: findPreviousSpan(snapshot, path),
    nextSpan: findNextSpan(snapshot, path),
  }
}

function findNextSpan(
  snapshot: TraversalSnapshot,
  path: Path,
): SpanEntry | undefined {
  // Descendants of `path` come first in document order after `path`
  // itself, so the node's own subtree is the nearest place a next span
  // can live.
  const descendantSpan = firstSpanIn(snapshot, path)
  if (descendantSpan) {
    return descendantSpan
  }

  let currentPath = path
  while (currentPath.length > 0) {
    const parentPath = nodeParentPath(currentPath)
    const siblings = getChildren(snapshot, parentPath)
    const index = childIndex(snapshot, siblings, currentPath)

    if (index !== -1) {
      for (
        let siblingIndex = index + 1;
        siblingIndex < siblings.length;
        siblingIndex++
      ) {
        const sibling = siblings[siblingIndex]!
        if (isSpan({schema: snapshot.context.schema}, sibling.node)) {
          return {node: sibling.node, path: sibling.path}
        }
        const siblingDescendantSpan = firstSpanIn(snapshot, sibling.path)
        if (siblingDescendantSpan) {
          return siblingDescendantSpan
        }
      }
    }

    currentPath = parentPath
  }

  return undefined
}

function findPreviousSpan(
  snapshot: TraversalSnapshot,
  path: Path,
): SpanEntry | undefined {
  // Ancestors of `path` precede it in document order but are never
  // spans (spans are leaves), so the nearest previous span lives in a
  // preceding sibling's subtree at some ancestor level.
  let currentPath = path
  while (currentPath.length > 0) {
    const parentPath = nodeParentPath(currentPath)
    const siblings = getChildren(snapshot, parentPath)
    const index = childIndex(snapshot, siblings, currentPath)

    if (index !== -1) {
      for (let siblingIndex = index - 1; siblingIndex >= 0; siblingIndex--) {
        const sibling = siblings[siblingIndex]!
        // A sibling's descendants come after the sibling itself in
        // document order, so the subtree's last span wins over the
        // sibling.
        const siblingDescendantSpan = lastSpanIn(snapshot, sibling.path)
        if (siblingDescendantSpan) {
          return siblingDescendantSpan
        }
        if (isSpan({schema: snapshot.context.schema}, sibling.node)) {
          return {node: sibling.node, path: sibling.path}
        }
      }
    }

    currentPath = parentPath
  }

  return undefined
}

/**
 * First span inside the subtree at `path`, in document order. Bounded
 * by the subtree size.
 */
function firstSpanIn(
  snapshot: TraversalSnapshot,
  path: Path,
): SpanEntry | undefined {
  for (const entry of getNodes(snapshot, {
    at: path,
    match: (node) => isSpan({schema: snapshot.context.schema}, node),
  })) {
    return entry as SpanEntry
  }
  return undefined
}

/**
 * Last span inside the subtree at `path`, in document order. Spans are
 * leaves, so the first span yielded by a reverse pre-order traversal
 * (which visits later subtrees entirely before earlier ones) is the
 * document-order-last span. Bounded by the subtree size.
 */
function lastSpanIn(
  snapshot: TraversalSnapshot,
  path: Path,
): SpanEntry | undefined {
  for (const entry of getNodes(snapshot, {
    at: path,
    match: (node) => isSpan({schema: snapshot.context.schema}, node),
    reverse: true,
  })) {
    return entry as SpanEntry
  }
  return undefined
}

/**
 * The path of the sibling-array level containing `path`'s last
 * segment: strips the trailing keyed/numeric segment and the run of
 * field-name segments before it (`[block, 'children', span]` →
 * `[block]`).
 */
function nodeParentPath(path: Path): Path {
  let end = path.length - 1
  while (end > 0 && typeof path[end - 1] === 'string') {
    end--
  }
  return path.slice(0, end)
}

/**
 * The index of `childPath`'s node within `siblings`. Resolves keyed
 * segments through `blockIndexMap` (O(1), verified against the sibling
 * array) with a linear fallback for misses and paths the map can't key
 * (numeric segments).
 *
 * Not built on `getSibling` (`traversal/get-sibling.ts`) deliberately:
 * its `match` tests the sibling node itself, while this walk needs
 * "is a span or contains one" and would still have to re-descend the
 * matched sibling to extract the span entry.
 */
function childIndex(
  snapshot: TraversalSnapshot,
  siblings: Array<{node: {_key?: string}; path: Path}>,
  childPath: Path,
): number {
  const lastSegment = childPath[childPath.length - 1]

  if (typeof lastSegment === 'number') {
    return lastSegment < siblings.length ? lastSegment : -1
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
    const mapIndex = snapshot.blockIndexMap.get(serializePath(childPath))
    if (
      mapIndex !== undefined &&
      siblings[mapIndex]?.node._key === lastSegment._key
    ) {
      return mapIndex
    }
  }

  return siblings.findIndex((sibling) => sibling.node._key === lastSegment._key)
}
