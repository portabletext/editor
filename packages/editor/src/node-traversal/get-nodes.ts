import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
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
    at?: Path
    from?: Path
    to?: Path
    match?: (node: Node, path: Path) => boolean
    reverse?: boolean
  } = {},
): Generator<{node: Node; path: Path}, void, undefined> {
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
): Generator<{node: Node; path: Path}, void, undefined> {
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
  path: Path,
  options: {
    match?: (node: Node, path: Path) => boolean
    reverse?: boolean
  },
): Generator<{node: Node; path: Path}, void, undefined> {
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
 * Compare two keyed paths in document order using sibling arrays from
 * getChildren. Returns -1, 0, or 1.
 *
 * Walks the tree to find the first diverging keyed segment, then compares
 * their positions in the sibling array.
 */
function comparePathsInTree(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  pathA: Path,
  pathB: Path,
): -1 | 0 | 1 {
  const keysA = pathA.filter(isKeyedSegment)
  const keysB = pathB.filter(isKeyedSegment)

  let currentPath: Path = []

  const minDepth = Math.min(keysA.length, keysB.length)

  for (let depth = 0; depth < minDepth; depth++) {
    const keyA = keysA[depth]!
    const keyB = keysB[depth]!

    if (keyA._key === keyB._key) {
      const children = getChildrenInternal(context, root, currentPath)
      const child = children.find((c) => c.node._key === keyA._key)
      if (child) {
        currentPath = child.path
      }
      continue
    }

    const siblings = getChildrenInternal(context, root, currentPath)
    let indexA = -1
    let indexB = -1

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i]!
      if (sibling.node._key === keyA._key) {
        indexA = i
      }
      if (sibling.node._key === keyB._key) {
        indexB = i
      }
      if (indexA !== -1 && indexB !== -1) {
        break
      }
    }

    if (indexA < indexB) {
      return -1
    }
    if (indexA > indexB) {
      return 1
    }

    return 0
  }

  // One path is a prefix of the other (ancestor relationship)
  // In DFS order, shorter path (ancestor) comes first
  if (keysA.length < keysB.length) {
    return -1
  }
  if (keysA.length > keysB.length) {
    return 1
  }

  return 0
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
  path: Path,
  options: {
    from?: Path
    to?: Path
    match?: (node: Node, path: Path) => boolean
    reverse?: boolean
  },
): Generator<{node: Node; path: Path}, void, undefined> {
  const {from, to, match, reverse = false} = options

  const children = getChildrenInternal(context, root, path)
  const entries = reverse ? [...children].reverse() : children

  for (const entry of entries) {
    if (canStopTraversal(context, root, entry.path, from, to, reverse)) {
      return
    }

    if (!couldContainInRangeNodes(context, root, entry.path, from, to)) {
      continue
    }

    if (isInRange(context, root, entry.path, from, to)) {
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
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  nodePath: Path,
  from: Path | undefined,
  to: Path | undefined,
): boolean {
  if (
    from !== undefined &&
    comparePathsInTree(context, root, nodePath, from) === -1
  ) {
    if (!isAncestorPath(nodePath, from)) {
      return false
    }
  }

  if (
    to !== undefined &&
    comparePathsInTree(context, root, nodePath, to) === 1
  ) {
    if (!isAncestorPath(nodePath, to)) {
      return false
    }
  }

  return true
}

/**
 * Check if a subtree rooted at `nodePath` could contain any nodes in the
 * [from, to] range.
 */
function couldContainInRangeNodes(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  nodePath: Path,
  from: Path | undefined,
  to: Path | undefined,
): boolean {
  if (isInRange(context, root, nodePath, from, to)) {
    return true
  }

  if (from !== undefined && isAncestorPath(nodePath, from)) {
    return true
  }

  if (to !== undefined && isAncestorPath(nodePath, to)) {
    return true
  }

  return false
}

/**
 * Check if all remaining nodes in iteration order will be outside the range.
 */
function canStopTraversal(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  nodePath: Path,
  from: Path | undefined,
  to: Path | undefined,
  reverse: boolean,
): boolean {
  if (reverse) {
    if (from === undefined) {
      return false
    }

    return (
      comparePathsInTree(context, root, nodePath, from) === -1 &&
      !isAncestorPath(nodePath, from)
    )
  }

  if (to === undefined) {
    return false
  }

  return comparePathsInTree(context, root, nodePath, to) === 1
}
