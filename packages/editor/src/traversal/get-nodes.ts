import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildren, getNodeChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

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
  snapshot: TraversalSnapshot,
  options: {
    at?: Path
    from?: Path
    to?: Path
    match?: (node: Node, path: Path) => boolean
    reverse?: boolean
  } = {},
): Generator<{node: Node; path: Path}, void, undefined> {
  const {at = [], from, to, match, reverse = false} = options

  if (from === undefined && to === undefined) {
    yield* getNodesSimple(snapshot, at, {match, reverse})
    return
  }

  yield* getNodesInRange(snapshot, at, {from, to, match, reverse})
}

/**
 * Get descendant nodes of a standalone node (not in the editor tree).
 * Used for cases like getDirtyPaths where the node hasn't been inserted yet.
 */
export function* getNodeDescendants(
  context: {
    schema: EditorSchema
    containers: Containers
  },
  node: Node | {value: Array<Node>},
): Generator<{node: Node; path: Path}, void, undefined> {
  // The editor root wrapper ({value: [...]}) is not a real node, so its field
  // name is not part of paths. For standalone nodes (a real {_key, _type, ...}
  // passed in by callers like getDirtyPaths), the field name IS part of the
  // path.
  const isRoot = !('_key' in node) && !('_type' in node)
  yield* walkStandalone(context, node, [], isRoot)
}

function* walkStandalone(
  context: {
    schema: EditorSchema
    containers: Containers
  },
  node: Node | {value: Array<Node>},
  path: Path,
  isRoot: boolean,
  parent?: RegisteredContainer,
): Generator<{node: Node; path: Path}, void, undefined> {
  const next = getNodeChildren(context, node, parent)
  if (!next) {
    return
  }

  for (const child of next.children) {
    const childPath: Path = isRoot
      ? [{_key: child._key}]
      : [...path, next.fieldName, {_key: child._key}]
    yield {node: child, path: childPath}
    yield* walkStandalone(context, child, childPath, false, next.parent)
  }
}

/**
 * Simple recursive DFS - the original behavior.
 * Yields all descendants of the node at `path`.
 */
function* getNodesSimple(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    match?: (node: Node, path: Path) => boolean
    reverse?: boolean
  },
): Generator<{node: Node; path: Path}, void, undefined> {
  const {match, reverse = false} = options

  const children = getChildren(snapshot, path)

  const entries = reverse ? [...children].reverse() : children

  for (const entry of entries) {
    if (!match || match(entry.node, entry.path)) {
      yield entry
    }

    yield* getNodesSimple(snapshot, entry.path, options)
  }
}

/**
 * Compare two keyed paths in document order. Returns -1, 0, or 1.
 *
 * Descends both paths from the root in a single pass, advancing
 * `currentNode` and `currentChildren` together so each level costs
 * one keyed-segment scan instead of an O(depth) walk from root.
 *
 * Uses `blockIndexMap` for O(1) lookup at the root level. Deeper
 * levels fall back to a linear scan of the current sibling array.
 */
function comparePathsInTree(
  snapshot: TraversalSnapshot,
  pathA: Path,
  pathB: Path,
): -1 | 0 | 1 {
  const keysA = pathA.filter(isKeyedSegment)
  const keysB = pathB.filter(isKeyedSegment)

  const {context} = snapshot
  let currentChildren: Array<Node> = context.value
  let currentParent: RegisteredContainer | undefined
  let isRootLevel = true

  const minDepth = Math.min(keysA.length, keysB.length)

  for (let depth = 0; depth < minDepth; depth++) {
    const keyA = keysA[depth]!
    const keyB = keysB[depth]!

    if (keyA._key === keyB._key) {
      // Same node at this depth: descend into its children for the next
      // iteration. The root level can short-circuit via blockIndexMap;
      // deeper levels scan the current sibling array.
      let matchedNode: Node | undefined
      if (isRootLevel && snapshot.blockIndexMap.has(keyA._key)) {
        const index = snapshot.blockIndexMap.get(keyA._key)
        if (index !== undefined) {
          matchedNode = currentChildren[index]
        }
      } else {
        matchedNode = currentChildren.find((c) => c._key === keyA._key)
      }
      if (!matchedNode) {
        return 0
      }
      const next = getNodeChildren(context, matchedNode, currentParent)
      if (!next) {
        return 0
      }
      currentChildren = next.children
      currentParent = next.parent

      isRootLevel = false
      continue
    }

    if (isRootLevel) {
      const indexA = snapshot.blockIndexMap.get(keyA._key) ?? -1
      const indexB = snapshot.blockIndexMap.get(keyB._key) ?? -1
      if (indexA !== -1 && indexB !== -1) {
        if (indexA < indexB) {
          return -1
        }
        if (indexA > indexB) {
          return 1
        }
        return 0
      }
    }

    let indexA = -1
    let indexB = -1
    for (let i = 0; i < currentChildren.length; i++) {
      const sibling = currentChildren[i]!
      if (sibling._key === keyA._key) {
        indexA = i
      }
      if (sibling._key === keyB._key) {
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
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    from?: Path
    to?: Path
    match?: (node: Node, path: Path) => boolean
    reverse?: boolean
  },
): Generator<{node: Node; path: Path}, void, undefined> {
  const {from, to, match, reverse = false} = options

  const children = getChildren(snapshot, path)
  const entries = reverse ? [...children].reverse() : children

  for (const entry of entries) {
    if (canStopTraversal(snapshot, entry.path, from, to, reverse)) {
      return
    }

    if (!couldContainInRangeNodes(snapshot, entry.path, from, to)) {
      continue
    }

    if (isInRange(snapshot, entry.path, from, to)) {
      if (!match || match(entry.node, entry.path)) {
        yield entry
      }
    }

    yield* getNodesInRange(snapshot, entry.path, options)
  }
}

/**
 * Check if a node is within the [from, to] range in document order.
 * Both bounds are inclusive. Ancestor nodes of from or to are also
 * considered in range since they contain the range boundary.
 */
function isInRange(
  snapshot: TraversalSnapshot,
  nodePath: Path,
  from: Path | undefined,
  to: Path | undefined,
): boolean {
  if (
    from !== undefined &&
    comparePathsInTree(snapshot, nodePath, from) === -1
  ) {
    if (!isAncestorPath(nodePath, from)) {
      return false
    }
  }

  if (to !== undefined && comparePathsInTree(snapshot, nodePath, to) === 1) {
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
  snapshot: TraversalSnapshot,
  nodePath: Path,
  from: Path | undefined,
  to: Path | undefined,
): boolean {
  if (isInRange(snapshot, nodePath, from, to)) {
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
  snapshot: TraversalSnapshot,
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
      comparePathsInTree(snapshot, nodePath, from) === -1 &&
      !isAncestorPath(nodePath, from)
    )
  }

  if (to === undefined) {
    return false
  }

  return comparePathsInTree(snapshot, nodePath, to) === 1
}
