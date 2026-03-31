import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildrenInternal} from './get-children'

/**
 * Get the descendant nodes of the node at a given path.
 *
 * When `from` and `to` are provided, performs a range-bounded DFS traversal,
 * yielding only nodes between `from` and `to` (inclusive). Both paths are
 * always in document order: `from` is the earlier path, `to` is the later
 * path. The `reverse` flag controls iteration direction within that range.
 *
 * When `match` is provided, only yields nodes where the predicate returns true.
 * The traversal still visits all nodes in range - `match` is a filter, not a
 * traversal control.
 *
 * When `at` is provided, traverses descendants of the node at that path
 * instead of the root.
 */
export function* getNodes(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  options: {
    at?: Array<number>
    from?: Array<number>
    to?: Array<number>
    match?: (node: Node, path: Array<number>) => boolean
    reverse?: boolean
  } = {},
): Generator<{node: Node; path: Array<number>}, void, undefined> {
  const {at = [], from, to, match, reverse = false} = options
  const traversalContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
  }
  const root = {value: context.value}

  // When from/to are not provided, use the simple recursive DFS
  if (from === undefined && to === undefined) {
    yield* getNodesSimple(traversalContext, root, at, {match, reverse})
    return
  }

  yield* getNodesInRange(traversalContext, root, at, {
    from,
    to,
    match,
    reverse,
  })
}

/**
 * Get descendant nodes of a standalone node (not in the editor tree).
 * Used for cases like getDirtyPaths where the node hasn't been inserted yet.
 */
export function* getNodeDescendants(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  node: Node | {value: Array<Node>},
): Generator<{node: Node; path: Array<number>}, void, undefined> {
  yield* getNodesSimple(context, node, [], {})
}

/**
 * Simple recursive DFS - the original behavior.
 * Yields all descendants of the node at `path`.
 */
function* getNodesSimple(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  path: Array<number>,
  options: {
    match?: (node: Node, path: Array<number>) => boolean
    reverse?: boolean
  },
): Generator<{node: Node; path: Array<number>}, void, undefined> {
  const {match, reverse = false} = options

  const children = getChildrenInternal(context, root, path)

  const entries = reverse ? [...children].reverse() : children

  for (const entry of entries) {
    if (!match || match(entry.node, entry.path)) {
      yield entry
    }

    yield* getNodesSimple(context, root, entry.path, options)
  }
}

/**
 * Compare two paths in DFS (document) order.
 *
 * In DFS order, a parent comes before its children, and children come before
 * the parent's next sibling. So [4] < [4,0] < [4,0,0] < [4,1] < [5].
 */
function compareDfsOrder(
  pathA: Array<number>,
  pathB: Array<number>,
): -1 | 0 | 1 {
  const minLength = Math.min(pathA.length, pathB.length)

  for (let index = 0; index < minLength; index++) {
    const segmentA = pathA[index]!
    const segmentB = pathB[index]!

    if (segmentA < segmentB) {
      return -1
    }
    if (segmentA > segmentB) {
      return 1
    }
  }

  if (pathA.length < pathB.length) {
    return -1
  }
  if (pathA.length > pathB.length) {
    return 1
  }

  return 0
}

/**
 * Check if `candidatePath` is a proper prefix of `targetPath`.
 */
function isAncestorOf(
  candidatePath: Array<number>,
  targetPath: Array<number>,
): boolean {
  if (candidatePath.length >= targetPath.length) {
    return false
  }

  for (let index = 0; index < candidatePath.length; index++) {
    if (candidatePath[index] !== targetPath[index]) {
      return false
    }
  }

  return true
}

/**
 * Range-bounded recursive DFS traversal.
 *
 * `from` and `to` are always in document order (from is earlier, to is
 * later), regardless of traversal direction.
 */
function* getNodesInRange(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  path: Array<number>,
  options: {
    from?: Array<number>
    to?: Array<number>
    match?: (node: Node, path: Array<number>) => boolean
    reverse?: boolean
  },
): Generator<{node: Node; path: Array<number>}, void, undefined> {
  const {from, to, match, reverse = false} = options

  const children = getChildrenInternal(context, root, path)
  const entries = reverse ? [...children].reverse() : children

  for (const entry of entries) {
    if (canStopTraversal(entry.path, from, to, reverse)) {
      return
    }

    if (!couldContainInRangeNodes(entry.path, from, to)) {
      continue
    }

    if (isInRange(entry.path, from, to)) {
      if (!match || match(entry.node, entry.path)) {
        yield entry
      }
    }

    yield* getNodesInRange(context, root, entry.path, options)
  }
}

/**
 * Check if a node is within the [from, to] range in document order.
 * Both bounds are inclusive. Ancestor nodes of from or to are also
 * considered in range since they contain the range boundary.
 */
function isInRange(
  nodePath: Array<number>,
  from: Array<number> | undefined,
  to: Array<number> | undefined,
): boolean {
  if (from !== undefined && compareDfsOrder(nodePath, from) === -1) {
    if (!isAncestorOf(nodePath, from)) {
      return false
    }
  }

  if (to !== undefined && compareDfsOrder(nodePath, to) === 1) {
    if (!isAncestorOf(nodePath, to)) {
      return false
    }
  }

  return true
}

/**
 * Check if a subtree rooted at `nodePath` could contain any nodes in the
 * [from, to] range. Returns true if the node is in range, or if the node
 * is an ancestor of either bound (its subtree contains in-range nodes).
 */
function couldContainInRangeNodes(
  nodePath: Array<number>,
  from: Array<number> | undefined,
  to: Array<number> | undefined,
): boolean {
  if (isInRange(nodePath, from, to)) {
    return true
  }

  if (from !== undefined && isAncestorOf(nodePath, from)) {
    return true
  }

  if (to !== undefined && isAncestorOf(nodePath, to)) {
    return true
  }

  return false
}

/**
 * Check if all remaining nodes in iteration order will be outside the range.
 */
function canStopTraversal(
  nodePath: Array<number>,
  from: Array<number> | undefined,
  to: Array<number> | undefined,
  reverse: boolean,
): boolean {
  if (reverse) {
    if (from === undefined) {
      return false
    }

    return (
      compareDfsOrder(nodePath, from) === -1 && !isAncestorOf(nodePath, from)
    )
  }

  if (to === undefined) {
    return false
  }

  return compareDfsOrder(nodePath, to) === 1
}
