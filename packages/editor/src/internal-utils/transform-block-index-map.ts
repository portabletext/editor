import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {parentPath as getParentPath} from '../engine/path/parent-path'
import {serializePath} from '../paths/serialize-path'
import type {RegisteredContainer} from '../schema/container-types'
import {getNodeChildren} from '../traversal/get-children'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {BlockIndexMap} from './block-index-map'
import {buildIndexMaps, collectDescendantIndexes} from './build-index-maps'

/**
 * Context needed by the pure `transformBlockIndexMap` function. Pure
 * w.r.t. value: value is passed explicitly as `beforeValue`/`afterValue`.
 */
type PureTransformContext = Pick<EditorContext, 'schema' | 'containers'>

/**
 * Apply an editor operation's structural effect to a `blockIndexMap`.
 *
 * Pure function. Given a map built from `beforeValue` and an operation
 * that produced `afterValue`, mutates the map so it equals one built
 * fresh from `afterValue`. The oracle invariant is exercised in
 * `transform-block-index-map.test.ts`. Called once per operation by the
 * update-value plugin, after the value tree has settled.
 *
 * Text and selection ops have no structural effect. Insert/unset/set
 * shift, remove, and add entries scoped to the affected siblings and
 * subtree only; the whole map is never walked.
 */
export function transformBlockIndexMap(
  map: BlockIndexMap,
  op: EngineOperation,
  beforeValue: ReadonlyArray<Node>,
  afterValue: ReadonlyArray<Node>,
  context: PureTransformContext,
): void {
  switch (op.type) {
    case 'insert.text':
    case 'remove.text':
    case 'set.selection':
      return
    case 'insert': {
      // Resolve the anchor index. The path's last segment addresses an
      // existing sibling (keyed) or is a literal index (numeric); for keyed
      // paths the map already holds the index (it reflects `beforeValue` here,
      // before this op mutates it), so this is O(1) instead of a linear scan.
      const anchorIndex = childIndexFromMap(map, beforeValue, op.path)
      if (anchorIndex < 0) {
        // The anchor doesn't exist in `beforeValue`, so the operation
        // cannot have changed the tree.
        return
      }
      const siblingContext = resolveSiblingContext(context, afterValue, op.path)
      if (!siblingContext) {
        return
      }
      // The underlying splice clamps out-of-range numeric inserts to an
      // append, so the node can never sit past the end of the children.
      const insertIndex = Math.min(
        op.position === 'after' ? anchorIndex + 1 : anchorIndex,
        siblingContext.children.length - 1,
      )
      reindexSiblings(map, siblingContext, insertIndex)
      // The inserted node now sits at `insertIndex` in `afterValue`. Replace
      // the op path's last segment with the numeric position; preserves any
      // preceding field-name segment.
      const insertedNumericPath: Path = [...op.path.slice(0, -1), insertIndex]
      addSubtree(map, context, afterValue, insertedNumericPath)
      return
    }
    case 'unset': {
      // Root-level unset: `path = []` clears all blocks.
      if (op.path.length === 0) {
        map.clear()
        return
      }
      const lastSegment = op.path[op.path.length - 1]
      if (typeof lastSegment === 'string') {
        if (hasKeyedEntries(resolveValueAtPath(beforeValue, op.path))) {
          // The removed property held keyed nodes (a container field), so
          // their entries must be pruned.
          reconcileOwnerSubtree(map, context, beforeValue, afterValue, op.path)
        }
        return
      }
      const removeIndex = childIndexFromMap(map, beforeValue, op.path)
      pruneSubtreeAtPath(map, beforeValue, op.path)
      if (removeIndex >= 0) {
        const siblingContext = resolveSiblingContext(
          context,
          afterValue,
          op.path,
        )
        if (siblingContext) {
          reindexSiblings(map, siblingContext, removeIndex)
        }
      }
      return
    }
    case 'set': {
      // Root-level full replace: `path = []`.
      if (op.path.length === 0) {
        map.clear()
        buildIndexMaps(
          {
            schema: context.schema,
            value: afterValue as unknown as PortableTextBlock[],
            containers: context.containers,
          },
          {blockIndexMap: map, listIndexMap: new Map()},
        )
        return
      }
      const lastSegment = op.path[op.path.length - 1]
      // `set [...nodePath, propertyName] = value` is the common path
      // (modifyDescendant). `set [...keyedPath] = wholeNode` is a
      // full node replacement.
      if (typeof lastSegment === 'string') {
        if (lastSegment === '_key') {
          handleKeyChange(
            map,
            beforeValue,
            afterValue,
            op.path.slice(0, -1),
            context,
          )
          return
        }
        // A property change affects the map when the new value may carry
        // keyed descendants (synthesized array fields like `rows`,
        // `cells`, `content`) or the old value did (a container field
        // replaced by a primitive).
        if (
          (op.value !== null && typeof op.value === 'object') ||
          hasKeyedEntries(resolveValueAtPath(beforeValue, op.path))
        ) {
          reconcileOwnerSubtree(map, context, beforeValue, afterValue, op.path)
        }
        return
      }
      // Last segment is keyed or numeric (full node replacement). The
      // replacement may carry a different `_key` than the path
      // addresses, so locate the new node by index instead of by key.
      const childIndex = childIndexFromMap(map, beforeValue, op.path)
      pruneSubtreeAtPath(map, beforeValue, op.path)
      if (childIndex >= 0) {
        addSubtree(map, context, afterValue, [
          ...op.path.slice(0, -1),
          childIndex,
        ])
      }
      return
    }
  }
}

/**
 * Find the child index for a keyed path's last segment by walking the
 * value. Used when an op's path ends in a `KeyedSegment` instead of a
 * numeric index. Returns `-1` if not resolvable.
 */
/**
 * Resolve a child index for `path`'s last segment. Numeric last segments are
 * the index directly; for keyed segments the block-index map holds it, and the
 * map reflects `beforeValue` at the call sites (before this operation mutates
 * the map), so it is an O(1) lookup instead of the linear scan in
 * `resolveChildIndexInValue`. A numeric path segment can't form the map's keyed
 * id, and a map miss falls back to the scan; the oracle/fuzz tests pin
 * equivalence.
 */
function childIndexFromMap(
  map: ReadonlyMap<string, number>,
  beforeValue: ReadonlyArray<Node>,
  path: Path,
): number {
  const last = path[path.length - 1]
  if (typeof last === 'number') {
    return last
  }
  if (isKeyedSegment(last)) {
    let keyed = true
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof path[i] === 'number') {
        keyed = false
        break
      }
    }
    if (keyed) {
      const index = map.get(serializePath(path))
      if (index !== undefined) {
        return index
      }
    }
  }
  return resolveChildIndexInValue(beforeValue, path)
}

function resolveChildIndexInValue(
  value: ReadonlyArray<Node>,
  path: Path,
): number {
  let currentChildren: ReadonlyArray<Node> = value
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!
    if (typeof segment === 'string') {
      continue
    }
    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      node = currentChildren.find((c) => c._key === segment._key)
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
    }
    if (!node) {
      return -1
    }
    // Descend into the next named field (the following path segment is a string)
    const next = path[i + 1]
    if (typeof next === 'string') {
      const field = (node as Record<string, unknown>)[next]
      if (!Array.isArray(field)) {
        return -1
      }
      currentChildren = field as ReadonlyArray<Node>
      i++
    }
  }
  const last = path[path.length - 1]!
  if (typeof last === 'number') {
    return last
  }
  if (isKeyedSegment(last)) {
    return currentChildren.findIndex((c) => c._key === last._key)
  }
  return -1
}

/**
 * Resolve the sibling array an op path points into, together with the
 * serialized path prefix shared by every sibling's map key. Returns
 * `undefined` when the path doesn't address the parent's registered
 * container field (e.g. a `markDefs` path); those nodes are never
 * indexed, so their siblings must not be touched.
 */
function resolveSiblingContext(
  context: PureTransformContext,
  value: ReadonlyArray<Node>,
  opPath: Path,
):
  | {
      children: ReadonlyArray<Node>
      serializedPrefix: string
    }
  | undefined {
  if (opPath.length === 1) {
    return {children: value, serializedPrefix: ''}
  }
  const fieldSegment = opPath[opPath.length - 2]
  if (typeof fieldSegment !== 'string') {
    return undefined
  }
  const keyedParentPath = toKeyedPath(value, getParentPath(opPath))
  if (keyedParentPath === undefined) {
    return undefined
  }
  const resolvedParent = resolveIndexableNode(context, value, keyedParentPath)
  if (!resolvedParent) {
    return undefined
  }
  const childrenResult = getNodeChildren(
    context,
    resolvedParent.node,
    resolvedParent.containerOfParent,
  )
  if (!childrenResult || childrenResult.fieldName !== fieldSegment) {
    return undefined
  }
  return {
    children: childrenResult.children,
    serializedPrefix: serializePath([...keyedParentPath, fieldSegment]),
  }
}

/**
 * Re-set the map entries of every sibling from `startIndex` to the end
 * of the array. Re-deriving the suffix from the value covers inserts
 * (new node plus shifted right neighbours) and removals (shifted left
 * neighbours) alike. Descendants of shifted siblings keep both their
 * keys (paths don't change) and their values (their own child index
 * doesn't change), so only the sibling level needs touching.
 */
function reindexSiblings(
  map: BlockIndexMap,
  siblingContext: {
    children: ReadonlyArray<Node>
    serializedPrefix: string
  },
  startIndex: number,
): void {
  for (
    let childIndex = Math.max(0, startIndex);
    childIndex < siblingContext.children.length;
    childIndex++
  ) {
    const child = siblingContext.children[childIndex]
    if (!child || child._key === undefined) {
      continue
    }
    // Mirrors `serializePath`'s keyed-segment format.
    map.set(
      `${siblingContext.serializedPrefix}[_key=="${child._key}"]`,
      childIndex,
    )
  }
}

/**
 * Remove map entries for the node at `nodePath` in `beforeValue` and all its
 * keyed descendants. Cost is bounded by the subtree size.
 */
function pruneSubtreeAtPath(
  map: BlockIndexMap,
  beforeValue: ReadonlyArray<Node>,
  nodePath: Path,
  keepSelf: boolean = false,
): void {
  const node = resolveNodeAtPath(beforeValue, nodePath)
  if (!node) {
    return
  }
  const keyedPath = toKeyedPath(beforeValue, nodePath)
  if (keyedPath === undefined) {
    return
  }
  if (!keepSelf) {
    map.delete(serializePath(keyedPath))
  }
  // Deletion deliberately walks every array-valued field instead of the
  // resolved container chain: stale entries must go even when the value
  // no longer matches the schema, and deleting an absent key is free.
  walkKeyedChildrenInValue(node, keyedPath, (childPath) => {
    map.delete(serializePath(childPath))
  })
}

/**
 * Generic walk over keyed-child arrays in a node. Iterates every
 * array-valued field; for each entry with a `_key`, recurses. Mirrors
 * `getNodeChildren` shape but without requiring container resolution.
 */
export function walkKeyedChildrenInValue(
  node: Node,
  nodePath: Path,
  visit: (childPath: Path) => void,
): void {
  for (const key of Object.keys(node as Record<string, unknown>)) {
    const field = (node as Record<string, unknown>)[key]
    if (!Array.isArray(field)) {
      continue
    }
    for (const child of field as ReadonlyArray<Node>) {
      if (!child || child._key === undefined) {
        continue
      }
      const childPath: Path = [...nodePath, key, {_key: child._key}]
      visit(childPath)
      walkKeyedChildrenInValue(child, childPath, visit)
    }
  }
}

/**
 * Walk the subtree at `nodePath` in `afterValue` and insert each keyed
 * descendant into the map. The path is validated against the resolved
 * container chain first, so nodes outside registered container fields
 * (e.g. `markDefs` entries) never gain entries.
 */
function addSubtree(
  map: BlockIndexMap,
  context: PureTransformContext,
  afterValue: ReadonlyArray<Node>,
  opPath: Path,
): void {
  // Resolve the keyed path (op paths may be numeric; the map stores
  // keyed paths exclusively).
  const keyedPath = toKeyedPath(afterValue, opPath)
  if (keyedPath === undefined) {
    return
  }
  const resolved = resolveIndexableNode(context, afterValue, keyedPath)
  if (!resolved) {
    return
  }
  const childIndex = resolveChildIndexInValue(afterValue, opPath)
  if (childIndex >= 0) {
    map.set(serializePath(keyedPath), childIndex)
  }
  collectDescendantIndexes(
    context,
    resolved.node,
    keyedPath,
    resolved.containerOfParent,
    map,
  )
}

/**
 * Resolve the node at `keyedPath` by descending through each level's
 * resolved container field. Returns `undefined` when any field segment
 * isn't the registered container field at that level, since such paths are
 * never indexed. Also returns the container entry of the node's parent,
 * which `getNodeChildren`/`collectDescendantIndexes` need to resolve
 * positional `of` shapes for further descent.
 */
function resolveIndexableNode(
  context: PureTransformContext,
  value: ReadonlyArray<Node>,
  keyedPath: Path,
):
  | {
      node: Node
      containerOfParent: RegisteredContainer | undefined
    }
  | undefined {
  if (keyedPath.length === 0) {
    return undefined
  }
  let current: Node | {value: Array<Node>} = {value: value as Array<Node>}
  let containerOfParent: RegisteredContainer | undefined
  let index = 0
  while (index < keyedPath.length) {
    const childrenResult = getNodeChildren(context, current, containerOfParent)
    if (!childrenResult) {
      return undefined
    }
    if (index > 0) {
      const fieldSegment = keyedPath[index]
      if (
        typeof fieldSegment !== 'string' ||
        fieldSegment !== childrenResult.fieldName
      ) {
        return undefined
      }
      index++
    }
    const childSegment = keyedPath[index]
    let child: Node | undefined
    if (isKeyedSegment(childSegment)) {
      child = childrenResult.children.find(
        (candidate) => candidate._key === childSegment._key,
      )
    } else if (typeof childSegment === 'number') {
      child = childrenResult.children.at(childSegment)
    }
    if (!child) {
      return undefined
    }
    current = child
    containerOfParent = childrenResult.parent
    index++
  }
  return {node: current as Node, containerOfParent}
}

/**
 * Re-derive the map entries below the node that owns the property at
 * `propertyPath`: prune everything the node had in `beforeValue`, then
 * re-walk it in `afterValue`. Bounded by the owner's subtree size.
 */
function reconcileOwnerSubtree(
  map: BlockIndexMap,
  context: PureTransformContext,
  beforeValue: ReadonlyArray<Node>,
  afterValue: ReadonlyArray<Node>,
  propertyPath: Path,
): void {
  let ownerPathEnd = propertyPath.length
  while (
    ownerPathEnd > 0 &&
    typeof propertyPath[ownerPathEnd - 1] === 'string'
  ) {
    ownerPathEnd--
  }
  if (ownerPathEnd === 0) {
    return
  }
  const ownerPath = propertyPath.slice(0, ownerPathEnd)
  pruneSubtreeAtPath(map, beforeValue, ownerPath, /*keepSelf*/ true)
  addSubtree(map, context, afterValue, ownerPath)
}

/**
 * Resolve the raw value at `path`, following keyed/numeric node
 * segments and a trailing run of property-name segments.
 */
function resolveValueAtPath(value: ReadonlyArray<Node>, path: Path): unknown {
  let nodePathEnd = path.length
  while (nodePathEnd > 0 && typeof path[nodePathEnd - 1] === 'string') {
    nodePathEnd--
  }
  if (nodePathEnd === 0) {
    return undefined
  }
  let current: unknown = resolveNodeAtPath(value, path.slice(0, nodePathEnd))
  for (let i = nodePathEnd; i < path.length; i++) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[path[i] as string]
  }
  return current
}

function hasKeyedEntries(value: unknown): boolean {
  // Container fields are always direct array fields, so checking the
  // array's own entries for `_key`s is sufficient.
  return (
    Array.isArray(value) &&
    value.some(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        (entry as Node)._key !== undefined,
    )
  )
}

/**
 * Rewrite each numeric segment in `path` to a keyed segment by
 * resolving against `value`. Returns `undefined` if any segment
 * doesn't resolve, or if a keyed node has no `_key`.
 */
function toKeyedPath(value: ReadonlyArray<Node>, path: Path): Path | undefined {
  const result: Array<Path[number]> = []
  let currentChildren: ReadonlyArray<Node> = value
  let currentNode: Node | undefined
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!
    if (typeof segment === 'string') {
      result.push(segment)
      if (!currentNode) {
        return undefined
      }
      const field = (currentNode as Record<string, unknown>)[segment]
      if (!Array.isArray(field)) {
        return undefined
      }
      currentChildren = field as ReadonlyArray<Node>
      continue
    }
    if (typeof segment === 'number') {
      currentNode = currentChildren.at(segment)
      if (!currentNode || currentNode._key === undefined) {
        return undefined
      }
      result.push({_key: currentNode._key})
      continue
    }
    if (isKeyedSegment(segment)) {
      currentNode = currentChildren.find((c) => c._key === segment._key)
      if (!currentNode) {
        return undefined
      }
      result.push(segment)
      continue
    }
    return undefined
  }
  return result
}

function handleKeyChange(
  map: BlockIndexMap,
  beforeValue: ReadonlyArray<Node>,
  afterValue: ReadonlyArray<Node>,
  nodePath: Path,
  context: PureTransformContext,
): void {
  // Drop all map entries that lived under the node's old path.
  pruneSubtreeAtPath(map, beforeValue, nodePath, /*keepSelf*/ false)
  // The renamed node still sits at the same child index in
  // `afterValue`; locate it by index to build the new keyed path.
  const childIndex = resolveChildIndexInValue(beforeValue, nodePath)
  if (childIndex < 0) {
    return
  }
  const parentSegments = nodePath.slice(0, -1)
  const newKeyedNodePath: Path = [...parentSegments, childIndex]
  addSubtree(map, context, afterValue, newKeyedNodePath)
}

/**
 * Resolve a node at a path in a value tree. Handles both numeric and
 * keyed segments. Returns `undefined` if any segment doesn't resolve.
 */
function resolveNodeAtPath(
  value: ReadonlyArray<Node>,
  path: Path,
): Node | undefined {
  let currentChildren: ReadonlyArray<Node> = value
  let currentNode: Node | undefined
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!
    if (typeof segment === 'string') {
      if (!currentNode) {
        return undefined
      }
      const field = (currentNode as Record<string, unknown>)[segment]
      if (!Array.isArray(field)) {
        return undefined
      }
      currentChildren = field as ReadonlyArray<Node>
      continue
    }
    if (isKeyedSegment(segment)) {
      currentNode = currentChildren.find((c) => c._key === segment._key)
    } else if (typeof segment === 'number') {
      currentNode = currentChildren.at(segment)
    } else {
      return undefined
    }
    if (!currentNode) {
      return undefined
    }
  }
  return currentNode
}
