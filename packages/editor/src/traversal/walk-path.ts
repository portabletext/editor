import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {nodeSegment} from '../paths/node-segment'
import type {RegisteredContainer} from '../schema/resolve-containers'
import {isNonArrayObject} from '../utils/is-non-array-object'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNodeChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * One node the walk walked.
 */
export type WalkedNode<TParent = RegisteredContainer> = {
  node: Node
  /**
   * Keyed wherever the node has a usable `_key`, numeric otherwise.
   */
  path: Path
  /**
   * Where the node's segment sits in the walked path.
   */
  segmentIndex: number
  index: number
  siblings: Array<Node>
  /**
   * The container registration whose child array holds the node, threaded
   * so positional `of` registrations resolve at this position.
   */
  container: TParent | undefined
  /**
   * The node's own structural child array, or `undefined` for a leaf.
   */
  children: NodeChildren<TParent> | undefined
}

export type NodeChildren<TParent> = {
  children: Array<Node>
  fieldName: string
  parent: TParent | undefined
}

/**
 * The outcome of walking a path from the root.
 *
 * `found`: every node segment of the structural walk resolved. `rest` is
 * what follows the last node: nothing, trailing field names, or a data path
 * inside the last node's node that starts with a field other than its
 * structural child field (`markDefs`, `marks`, a block object's own array).
 *
 * `missing`: the node segment at `segmentIndex` is not in the array the walk
 * reached. `nodes` holds the nodes walked before it, and `siblings` is the
 * array that was searched.
 *
 * `invalid`: the path cannot address anything in Portable Text, because two
 * node segments sit side by side (there are no arrays directly inside
 * arrays), because it starts with a field name, or because a segment is
 * neither a field name nor a node segment.
 */
export type PathWalk<TParent = RegisteredContainer> =
  | {status: 'found'; nodes: Array<WalkedNode<TParent>>; rest: Path}
  | {
      status: 'missing'
      nodes: Array<WalkedNode<TParent>>
      siblings: Array<Node>
      segmentIndex: number
    }
  | {status: 'invalid'}

/**
 * Walk `path` from the editor root, one node at a time.
 *
 * After a node segment, the next segment must be a field name. When it is
 * the node's structural child field and a node segment follows, the walk
 * descends into that child array. Any other field name ends the structural
 * walk: the rest of the path is data inside the node. The rule keeps
 * holding past the end of the structural walk and past a missing node, so
 * a path that breaks it anywhere is `invalid` no matter which nodes exist.
 */
export function walkPath(snapshot: TraversalSnapshot, path: Path): PathWalk {
  return walkNodes(
    snapshot.context.value,
    path,
    (node, parent) => getNodeChildren(snapshot.context, node, parent),
    snapshot.blockIndexMap,
  )
}

/**
 * {@link walkPath} over any value with any notion of a node's structural
 * children. The container resolvers walk registrations rather than the
 * schema, and the raw-value walkers follow whichever array field the path
 * names, so each brings its own `childrenOf`. `fieldName` is the field the
 * path names after the node, if any.
 */
export function walkNodes<TParent>(
  value: Array<Node>,
  path: Path,
  childrenOf: (
    node: Node,
    parent: TParent | undefined,
    fieldName: string | undefined,
  ) => NodeChildren<TParent> | undefined,
  blockIndexMap: ReadonlyMap<string, number> = new Map(),
): PathWalk<TParent> {
  const nodes: Array<WalkedNode<TParent>> = []
  let siblings: Array<Node> = value
  let container: TParent | undefined
  let previousNode: WalkedNodeImpl<TParent> | undefined
  let segmentIndex = 0

  while (segmentIndex < path.length) {
    const segment = path[segmentIndex]

    if (!isNodeSegment(segment)) {
      return {status: 'invalid'}
    }

    const index = findChildIndex(blockIndexMap, siblings, previousNode, segment)
    const node = siblings[index]!

    if (index === -1) {
      return followsRule(path, segmentIndex)
        ? {status: 'missing', nodes, siblings, segmentIndex}
        : {status: 'invalid'}
    }

    const nextSegment = path[segmentIndex + 1]
    const visited: WalkedNodeImpl<TParent> = new WalkedNodeImpl(
      node,
      nodeSegment(node, index),
      previousNode,
      segmentIndex,
      index,
      siblings,
      container,
      childrenOf,
      typeof nextSegment === 'string' ? nextSegment : undefined,
    )
    nodes.push(visited)
    previousNode = visited
    segmentIndex++

    if (segmentIndex === path.length) {
      break
    }

    if (typeof nextSegment !== 'string') {
      return {status: 'invalid'}
    }

    const children = isNodeSegment(path[segmentIndex + 1])
      ? visited.children
      : undefined

    if (children === undefined || nextSegment !== children.fieldName) {
      return followsRule(path, segmentIndex)
        ? {status: 'found', nodes, rest: path.slice(segmentIndex)}
        : {status: 'invalid'}
    }

    siblings = children.children
    container = children.parent
    segmentIndex++
  }

  return {status: 'found', nodes, rest: []}
}

/**
 * A walked node. Its path, serialized key and children are only computed
 * when asked for: most callers only read the last node's node.
 */
class WalkedNodeImpl<TParent> implements WalkedNode<TParent> {
  readonly node: Node
  readonly segment: number | {_key: string}
  readonly segmentIndex: number
  readonly index: number
  readonly siblings: Array<Node>
  readonly container: TParent | undefined
  private readonly previous: WalkedNodeImpl<TParent> | undefined
  private readonly childrenOf: (
    node: Node,
    parent: TParent | undefined,
    fieldName: string | undefined,
  ) => NodeChildren<TParent> | undefined
  private readonly fieldName: string | undefined
  private cachedPath: Path | undefined
  private cachedKey: string | undefined
  private childrenResolved = false
  private cachedChildren: NodeChildren<TParent> | undefined

  constructor(
    node: Node,
    segment: number | {_key: string},
    previous: WalkedNodeImpl<TParent> | undefined,
    segmentIndex: number,
    index: number,
    siblings: Array<Node>,
    container: TParent | undefined,
    childrenOf: (
      node: Node,
      parent: TParent | undefined,
      fieldName: string | undefined,
    ) => NodeChildren<TParent> | undefined,
    fieldName: string | undefined,
  ) {
    this.node = node
    this.segment = segment
    this.previous = previous
    this.segmentIndex = segmentIndex
    this.index = index
    this.siblings = siblings
    this.container = container
    this.childrenOf = childrenOf
    this.fieldName = fieldName
  }

  get path(): Path {
    if (this.cachedPath === undefined) {
      this.cachedPath = this.previous
        ? [
            ...this.previous.path,
            this.previous.children!.fieldName,
            this.segment,
          ]
        : [this.segment]
    }
    return this.cachedPath
  }

  /**
   * `serializePath(this.path)`, built from the previous node's key.
   */
  get key(): string {
    if (this.cachedKey === undefined) {
      this.cachedKey = this.previous
        ? `${this.previous.key}.${this.previous.children!.fieldName}${serializeSegment(this.segment)}`
        : serializeSegment(this.segment, true)
    }
    return this.cachedKey
  }

  get children(): NodeChildren<TParent> | undefined {
    if (!this.childrenResolved) {
      this.cachedChildren = this.childrenOf(
        this.node,
        this.container,
        this.fieldName,
      )
      this.childrenResolved = true
    }
    return this.cachedChildren
  }
}

function serializeSegment(
  segment: number | {_key: string},
  first = false,
): string {
  return typeof segment === 'number'
    ? `${first ? '' : '.'}${segment}`
    : `[_key=="${segment._key}"]`
}

function isNodeSegment(
  segment: Path[number] | undefined,
): segment is number | {_key: string} {
  return isKeyedSegment(segment) || typeof segment === 'number'
}

/**
 * Whether a path tail keeps a field name between every two node segments.
 */
function followsRule(path: Path, from: number): boolean {
  for (let index = from + 1; index < path.length; index++) {
    if (isNodeSegment(path[index - 1]) && isNodeSegment(path[index])) {
      return false
    }
  }
  return true
}

function findChildIndex<TParent>(
  blockIndexMap: ReadonlyMap<string, number>,
  siblings: Array<Node>,
  parentNode: WalkedNodeImpl<TParent> | undefined,
  segment: number | {_key: string},
): number {
  if (typeof segment === 'number') {
    // Negative indices count from the end, like `Array.prototype.at`.
    const index = segment < 0 ? siblings.length + segment : segment
    return index >= 0 && index < siblings.length ? index : -1
  }

  if (blockIndexMap.size > 0) {
    // The map can miss (unkeyed transient nodes, e.g. `{_type:'table'}`
    // inserted by a remote patch before normalize mints a key) or disagree
    // with the traversed value (snapshots that pair the live map with a
    // pre-apply value, e.g. `textPatch`), so fall back to a linear scan.
    const key = serializeSegment(segment)
    const mappedIndex = blockIndexMap.get(
      parentNode
        ? `${parentNode.key}.${parentNode.children!.fieldName}${key}`
        : key,
    )
    if (
      mappedIndex !== undefined &&
      siblings[mappedIndex]?._key === segment._key
    ) {
      return mappedIndex
    }
  }

  return siblings.findIndex((child) => child?._key === segment._key)
}

/**
 * Whether `path` holds a node segment from `index` on.
 */
export function hasNodeSegmentFrom(path: Path, index: number): boolean {
  for (let segmentIndex = index; segmentIndex < path.length; segmentIndex++) {
    if (isNodeSegment(path[segmentIndex])) {
      return true
    }
  }
  return false
}

/**
 * The walked nodes above the node `path` addresses, root first, or
 * `undefined` when the walk never reached the array that node would sit in.
 *
 * The node itself is the last node when the path ends at it. A node inside
 * a data path (an annotation in `markDefs`) sits below the last node. A
 * missing node sits below the nodes walked before it.
 */
export function ancestorNodes<TParent>(
  walk: PathWalk<TParent>,
  path: Path,
): Array<WalkedNode<TParent>> | undefined {
  switch (walk.status) {
    case 'invalid':
      return undefined
    case 'missing':
      return hasNodeSegmentFrom(path, walk.segmentIndex + 1)
        ? undefined
        : walk.nodes
    case 'found': {
      const restNodeSegments = walk.rest.filter(isNodeSegment).length
      if (restNodeSegments === 0) {
        return walk.nodes.slice(0, -1)
      }
      return restNodeSegments === 1 ? walk.nodes : undefined
    }
  }
}

/**
 * The node whose array holds the node `path` addresses, found by walking
 * only the parent path. The rest of `path` (a field name, the node segment
 * and any trailing field names) is checked against the same rule without a
 * lookup, so a path that breaks it addresses no parent. Returns `undefined`
 * for a top-level node and for a path that addresses no array.
 *
 * Unlike {@link ancestorNodes}, the node at `path` itself is never looked
 * up, so its parent is found whether or not it exists.
 */
export function walkParent(
  snapshot: TraversalSnapshot,
  path: Path,
): WalkedNode | undefined {
  const lastNodeSegmentIndex = path.findLastIndex(isNodeSegment)
  const fieldSegmentIndex = lastNodeSegmentIndex - 1

  if (
    fieldSegmentIndex < 1 ||
    typeof path[fieldSegmentIndex] !== 'string' ||
    !followsRule(path, fieldSegmentIndex)
  ) {
    return undefined
  }

  const walk = walkPath(snapshot, path.slice(0, fieldSegmentIndex))

  if (walk.status !== 'found' || walk.rest.length > 0) {
    return undefined
  }

  return walk.nodes.at(-1)
}

/**
 * Children of the array field `path` names after a node, for walks over
 * raw values that follow the path's own field names rather than the
 * schema.
 */
export function namedArrayField(
  node: Node,
  _parent: undefined,
  fieldName: string | undefined,
): NodeChildren<undefined> | undefined {
  if (fieldName === undefined || !isNonArrayObject(node)) {
    return undefined
  }
  const fieldValue = (node as Record<string, unknown>)[fieldName]
  return Array.isArray(fieldValue)
    ? {children: fieldValue as Array<Node>, fieldName, parent: undefined}
    : undefined
}

/**
 * The node a walk ends at, when the path addresses a node: every node
 * segment was walked, and only field names follow the last one.
 */
export function walkedNode<TParent>(
  walk: PathWalk<TParent>,
): WalkedNode<TParent> | undefined {
  if (walk.status !== 'found' || hasNodeSegmentFrom(walk.rest, 0)) {
    return undefined
  }
  return walk.nodes.at(-1)
}

/**
 * Entries for the children of `parent` (the root when `undefined`), with
 * the paths `walkPath` would give them.
 */
export function childEntries(
  value: Array<Node>,
  parent: WalkedNode | undefined,
): Array<{node: Node; path: Path}> {
  if (!parent) {
    return value.flatMap((child, childIndex) =>
      isNonArrayObject(child)
        ? [{node: child, path: [nodeSegment(child, childIndex)]}]
        : [],
    )
  }

  if (!parent.children) {
    return []
  }

  const {children, fieldName} = parent.children

  return children.flatMap((child, childIndex) =>
    isNonArrayObject(child)
      ? [
          {
            node: child,
            path: [...parent.path, fieldName, nodeSegment(child, childIndex)],
          },
        ]
      : [],
  )
}
