import {subscribeToOperations} from '../engine/core/operation-channel'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {
  transformBlockIndexMap,
  walkKeyedChildrenInValue,
} from '../internal-utils/transform-block-index-map'
import {serializePath} from '../paths/serialize-path'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorContext} from './editor-snapshot'

/**
 * Serialize a sibling-group path to the id `normalizeNode` caches it under,
 * or return `null` if a node segment is numeric. Numeric segments do appear
 * on a few paths (`apply-merge-node` emits a numeric anchor when the
 * previous-children list is empty, and `normalizeNode` emits numeric paths
 * when fixing up a missing or duplicate `_key`), but the bulk insert/delete
 * paths this optimization targets are keyed. Resolving a numeric segment to
 * a keyed id would need a from-root walk (the very O(n) walk this is
 * avoiding), so the caller clears the whole set instead, which only costs
 * extra scans the next time `normalizeNode` visits.
 */
function groupId(prefix: Path): string | null {
  for (const segment of prefix) {
    if (typeof segment === 'number') {
      return null
    }
  }
  return serializePath(prefix)
}

/**
 * Drop the verified-unique verdict for every sibling group whose direct
 * membership an operation changes, so per-node duplicate-key normalization
 * re-scans exactly those groups and no others. A group is identified by the
 * serialized path of its parent node's child array (the root group is `''`).
 * An operation that introduces a subtree also drops the verdicts for the
 * groups inside it, so a reused key cannot inherit a stale verdict from a
 * group that previously held it. Reads only the operation path and node;
 * never walks the value from the root.
 */
export function invalidateVerifiedGroups(
  groups: Set<string>,
  operation: Exclude<
    EngineOperation,
    {type: 'set.selection' | 'insert.text' | 'remove.text'}
  >,
): void {
  // Nothing is verified yet (the common case during a batch of edits, whose
  // normalization is deferred), so there is nothing to invalidate. Skips the
  // per-operation path serialization entirely on the hot insert path.
  if (groups.size === 0) {
    return
  }

  // Whole-value replacement (`set []`/`unset []`): every group is rebuilt.
  if (operation.path.length === 0) {
    groups.clear()
    return
  }

  const drop = (prefix: Path): boolean => {
    const id = groupId(prefix)
    if (id === null) {
      groups.clear()
      return false
    }
    groups.delete(id)
    return true
  }

  const dropSubtreeGroups = (node: Node, nodePath: Path): void => {
    walkKeyedChildrenInValue(node, nodePath, (childPath) => {
      const id = groupId(childPath.slice(0, -1))
      if (id !== null) {
        groups.delete(id)
      }
    })
  }

  const path = operation.path
  const lastSegment = path[path.length - 1]

  if (operation.type === 'insert') {
    // The node joins the group containing the reference sibling.
    const groupPath = path.slice(0, -1)
    if (drop(groupPath) && operation.node._key !== undefined) {
      dropSubtreeGroups(operation.node, [
        ...groupPath,
        {_key: operation.node._key},
      ])
    }
    return
  }

  if (operation.type === 'unset') {
    if (typeof lastSegment === 'string' && lastSegment !== '_key') {
      // Unsetting a whole child-array field empties that field's group.
      drop(path)
      return
    }
    // Unsetting a node, or its `_key`, changes the node's own group.
    const nodePath = lastSegment === '_key' ? path.slice(0, -1) : path
    drop(nodePath.slice(0, -1))
    return
  }

  // `set`
  if (
    typeof lastSegment === 'number' ||
    isKeyedSegment(lastSegment) ||
    lastSegment === '_key'
  ) {
    // Node replacement, or a `_key` change: the node's group changes.
    const nodePath = lastSegment === '_key' ? path.slice(0, -1) : path
    if (drop(nodePath.slice(0, -1)) && lastSegment !== '_key') {
      const replacement = operation.value
      if (
        replacement !== null &&
        typeof replacement === 'object' &&
        !Array.isArray(replacement)
      ) {
        const replacementKey = (replacement as Node)._key
        if (replacementKey !== undefined) {
          dropSubtreeGroups(replacement as Node, [
            ...nodePath.slice(0, -1),
            {_key: replacementKey},
          ])
        }
      }
    }
    return
  }

  if (typeof lastSegment === 'string') {
    if (Array.isArray(operation.value)) {
      // Replacing a child array rebuilds that field's group.
      if (drop(path)) {
        for (const child of operation.value as ReadonlyArray<Node>) {
          if (child && child._key !== undefined) {
            dropSubtreeGroups(child, [...path, {_key: child._key}])
          }
        }
      }
      return
    }
    // A plain property whose value may carry keyed nodes: re-verify all.
    if (operation.value !== null && typeof operation.value === 'object') {
      groups.clear()
    }
  }
}

/**
 * Keeps `blockIndexMap` in sync with the value, transforming it
 * incrementally per operation so the operation pipeline (which resolves
 * keyed paths through it) never observes a stale map.
 *
 * `listIndexMap` is only consumed by the text-block renderer, never by
 * operations or selectors, so it is invalidated here and rebuilt lazily
 * on read (`getListIndexMap`) instead of per operation. List-item
 * numbering depends on block adjacency that any structural op can disturb
 * non-locally, so any structural op marks it dirty.
 *
 * `verifiedUniqueChildGroups` is invalidated per structural op so per-node
 * duplicate-key normalization can skip groups whose membership is unchanged
 * (see `invalidateVerifiedGroups`).
 */
export function subscribeUpdateValue(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextEditorEngine,
): () => void {
  // Only subscribed when normalization debugging is on (resolved once at
  // module init), keeping the per-operation `before` phase free of
  // debug-only listeners in production.
  const unsubscribeNormalizationLog = debug.normalization.enabled
    ? subscribeToOperations(
        editor,
        (event) => {
          if (event.isNormalizingNode) {
            debug.normalization(
              `((engine operation))\n${safeStringify(event.operation, 2)}`,
            )
          }
        },
        {phase: 'before'},
      )
    : undefined

  const unsubscribeIndexMaps = subscribeToOperations(editor, (event) => {
    const operation = event.operation

    if (operation.type === 'set.selection') {
      return
    }

    if (operation.type === 'insert.text' || operation.type === 'remove.text') {
      // Inserting and removing text has no effect on index maps so there is
      // no need to rebuild those.
      return
    }

    transformBlockIndexMap(
      editor.blockIndexMap,
      operation,
      event.beforeValue,
      editor.snapshot.context.value,
      {
        schema: context.schema,
        containers: editor.snapshot.context.containers,
      },
    )

    // List-item numbering depends on block adjacency that a structural op
    // anywhere in the tree can disturb non-locally, so invalidate rather
    // than reason about which paths matter. The map is rebuilt lazily the
    // next time the renderer reads it.
    editor.listIndexMapDirty = true

    invalidateVerifiedGroups(editor.verifiedUniqueChildGroups, operation)
  })

  return () => {
    unsubscribeNormalizationLog?.()
    unsubscribeIndexMaps()
  }
}
