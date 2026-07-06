import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {splitNodePath} from '../engine/path/split-node-path'
import {getChildren} from '../traversal/get-children'
import {getNodes} from '../traversal/get-nodes'
import {resolveChildEntryIndex} from '../traversal/resolve-child-entry-index'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

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

/**
 * Not built on `getSibling` (`traversal/get-sibling.ts`) deliberately:
 * its `match` tests the sibling node itself, while this walk needs
 * "is a span or contains one" and would still have to re-descend the
 * matched sibling to extract the span entry. Applies to
 * `findPreviousSpan` too.
 */
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
    const index = resolveChildEntryIndex(
      snapshot.blockIndexMap,
      siblings,
      currentPath,
    )

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
    const index = resolveChildEntryIndex(
      snapshot.blockIndexMap,
      siblings,
      currentPath,
    )

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
  // Drop the node's own segment, then its field-name trail: the owning
  // node of what remains is the parent.
  return splitNodePath(path.slice(0, -1)).nodePath
}
