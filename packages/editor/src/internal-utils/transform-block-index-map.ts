import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Node} from '../engine/interfaces/node'
import type {Operation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {parentPath as getParentPath} from '../engine/path/parent-path'
import {serializePath} from '../paths/serialize-path'
import type {
  RegisteredContainer,
  RegisteredPositional,
} from '../schema/container-types'
import {resolveContainerAt} from '../schema/resolve-container-at'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {BlockIndexMap} from './block-index-map'
import {buildIndexMaps, collectDescendantIndexes} from './build-index-maps'

/**
 * Context needed by the pure `transformBlockIndexMap` function. Pure
 * w.r.t. value — value is passed explicitly as `beforeValue`/`afterValue`.
 */
type PureTransformContext = Pick<EditorContext, 'schema' | 'containers'>

function isFullContainer(
  candidate: RegisteredContainer | RegisteredPositional | undefined,
): candidate is RegisteredContainer {
  return candidate !== undefined && 'field' in candidate
}

// Apply an op's structural effect to `blockIndexMap`. Each function mirrors
// the corresponding value-tree mutation. Called once per branch in
// `applyOperation` after the value tree has settled.

/**
 * Apply an editor operation's structural effect to a `blockIndexMap`.
 *
 * Pure function. Given a map built from `beforeValue` and an operation
 * that produced `afterValue`, mutates the map so it equals one built
 * fresh from `afterValue`. The oracle invariant is exercised in
 * `transform-block-index-map.test.ts`.
 *
 * Text and selection ops have no structural effect. Insert/unset/set
 * shift, remove, and add descendant entries scoped to the affected
 * subtree only — the whole map is never walked.
 */
export function transformBlockIndexMap(
  map: BlockIndexMap,
  op: Operation,
  beforeValue: ReadonlyArray<Node>,
  afterValue: ReadonlyArray<Node>,
  context: PureTransformContext,
): void {
  switch (op.type) {
    case 'insert_text':
    case 'remove_text':
    case 'set_selection':
      return
    case 'insert': {
      const parentNodePath = getParentPath(op.path)
      const lastSegment = op.path[op.path.length - 1]
      // Resolve the anchor index (the path's last segment addresses an
      // existing sibling for keyed paths, or a literal index for numeric).
      const anchorIndex =
        typeof lastSegment === 'number'
          ? lastSegment
          : resolveChildIndexInValue(beforeValue, op.path)
      const insertIndex =
        op.position === 'after' ? anchorIndex + 1 : anchorIndex
      shiftDescendantsAtParent(map, parentNodePath, insertIndex, +1)
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
        // Property unset (not a node removal). Property removal on a
        // node cannot affect the keyed structure under it.
        return
      }
      const parentNodePath = getParentPath(op.path)
      const removeIndex =
        typeof lastSegment === 'number'
          ? lastSegment
          : resolveChildIndexInValue(beforeValue, op.path)
      pruneSubtreeAtPath(map, beforeValue, op.path)
      if (removeIndex >= 0) {
        shiftDescendantsAtParent(map, parentNodePath, removeIndex, -1)
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
        const nodePath = op.path.slice(0, -1)
        if (lastSegment === '_key') {
          handleKeyChange(map, beforeValue, afterValue, nodePath, context)
          return
        }
        // Property change that may have introduced keyed descendants
        // (synthesized array fields like `rows`, `cells`, `content`).
        // Reconcile the parent node's subtree: prune what `beforeValue`
        // had below it, then walk `afterValue`.
        if (op.value !== null && typeof op.value === 'object') {
          pruneSubtreeAtPath(map, beforeValue, nodePath, /*keepSelf*/ true)
          addSubtree(map, context, afterValue, nodePath)
        }
        return
      }
      // Last segment is keyed or numeric — full node replacement.
      pruneSubtreeAtPath(map, beforeValue, op.path, /*keepSelf*/ true)
      addSubtree(map, context, afterValue, op.path)
      return
    }
  }
}

/**
 * Find the child index for a keyed path's last segment by walking the
 * value. Used when an op's path ends in a `KeyedSegment` instead of a
 * numeric index. Returns `-1` if not resolvable.
 */
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
 * Shift map entries for all keyed children of `parentNodePath` whose
 * index is at-or-above `pivot` by `direction` (1 or -1). Also walks
 * descendants of shifted children — but only their entries
 * already-in-map move, the parent path stays the same.
 *
 * For root-level shifts (parentNodePath empty) the index in the
 * `blockIndexMap` IS the root child index, so a key like
 * `[_key=="bN"]` carries the index we want to shift. For nested
 * shifts the parent's serialized path is a strict prefix of every
 * sibling's serialized path.
 */
function shiftDescendantsAtParent(
  map: BlockIndexMap,
  parentNodePath: Path,
  pivot: number,
  direction: 1 | -1,
): void {
  const parentSerialized =
    parentNodePath.length === 0 ? '' : serializePath(parentNodePath)
  // A sibling's serialized path is exactly: `${parentSerialized}.${field}[_key=="…"]`
  // For root-level, parentSerialized === '' so siblings are `[_key=="…"]`.
  const expectedPrefix = parentSerialized === '' ? '' : `${parentSerialized}.`
  for (const [key, idx] of map) {
    if (parentSerialized === '') {
      // Root siblings only: key must be exactly `[_key=="…"]`, no `.`
      if (key.includes('.')) {
        continue
      }
      if (!key.startsWith('[_key==')) {
        continue
      }
    } else {
      if (!key.startsWith(expectedPrefix)) {
        continue
      }
      // Sibling key shape: `${parentSerialized}.${fieldName}[_key=="…"]` with
      // no further `.` after the field name segment.
      const rest = key.slice(expectedPrefix.length)
      // rest = `fieldName[_key=="…"]` for a sibling; descendants have `.` further in.
      const fieldEnd = rest.indexOf('[')
      if (fieldEnd === -1) {
        continue
      }
      const afterKeyed = rest.indexOf(']', fieldEnd)
      if (afterKeyed === -1 || afterKeyed !== rest.length - 1) {
        continue
      }
    }
    if (direction === 1 ? idx >= pivot : idx > pivot) {
      map.set(key, idx + direction)
    }
  }
}

/**
 * Remove map entries for the node at `nodePath` in `beforeValue` and all its
 * keyed descendants. Uses `getNodeChildren` to walk the subtree, so the
 * cost is bounded by the subtree size — not the map size.
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
  // Walk descendants in `beforeValue` and delete each by path.
  // We don't have an EditorContext here, so descend through known
  // shape: a node's keyed children live under a single array field. We
  // can't know the field name without context — but we don't NEED
  // schema to walk the value, we can iterate every array-valued
  // property whose entries have `_key`s.
  walkKeyedChildrenInValue(node, keyedPath, (childPath) => {
    map.delete(serializePath(childPath))
  })
}

/**
 * Generic walk over keyed-child arrays in a node. Iterates every
 * array-valued field; for each entry with a `_key`, recurses. Mirrors
 * `getNodeChildren` shape but without requiring container resolution.
 */
function walkKeyedChildrenInValue(
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
 * descendant into the map. Uses `getNodeChildren` for proper container
 * resolution so positional `of` shapes follow the schema.
 */
function addSubtree(
  map: BlockIndexMap,
  context: PureTransformContext,
  afterValue: ReadonlyArray<Node>,
  opPath: Path,
): void {
  const node = resolveNodeAtPath(afterValue, opPath)
  if (!node) {
    return
  }
  // Resolve the keyed path (op paths may be numeric; the map stores
  // keyed paths exclusively).
  const keyedPath = toKeyedPath(afterValue, opPath)
  if (keyedPath === undefined) {
    return
  }
  const childIndex = resolveChildIndexInValue(afterValue, opPath)
  if (childIndex >= 0) {
    map.set(serializePath(keyedPath), childIndex)
  }
  const parentNodePath = getParentPath(keyedPath)
  const parentContainer =
    parentNodePath.length > 0
      ? resolveContainerAt(context.containers, afterValue, parentNodePath)
      : undefined
  collectDescendantIndexes(
    {schema: context.schema, containers: context.containers},
    node,
    keyedPath,
    isFullContainer(parentContainer) ? parentContainer : undefined,
    map,
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
      if (!currentNode) {
        return undefined
      }
      result.push({_key: currentNode._key as string})
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
