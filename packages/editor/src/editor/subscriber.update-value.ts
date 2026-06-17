import {subscribeToOperations} from '../engine/core/operation-channel'
import type {EngineOperation} from '../engine/interfaces/operation'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {transformBlockIndexMap} from '../internal-utils/transform-block-index-map'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorContext} from './editor-snapshot'

/**
 * Whether an operation can add, remove, or re-key a *direct* child of the
 * root value array, the only kind of change that can introduce a duplicate
 * key among root blocks. Deep operations (two or more node segments) edit
 * inside a block and never touch root membership. Used to invalidate
 * `editor.rootKeysVerifiedUnique`; over-reporting only costs an extra root
 * scan, under-reporting would miss a duplicate, so the `set` case is the
 * only one narrowed (a plain property write can't collide a key).
 */
function affectsRootMembership(operation: EngineOperation): boolean {
  if (operation.type === 'set.selection') {
    return false
  }

  if (operation.type === 'set' && operation.path.length === 0) {
    return true
  }

  let nodeSegments = 0
  for (const segment of operation.path) {
    if (typeof segment === 'number' || isKeyedSegment(segment)) {
      nodeSegments++
    }
  }

  if (nodeSegments > 1) {
    return false
  }

  if (operation.type === 'insert' || operation.type === 'unset') {
    return true
  }

  if (operation.type === 'set') {
    const lastSegment = operation.path[operation.path.length - 1]
    return (
      typeof lastSegment === 'number' ||
      isKeyedSegment(lastSegment) ||
      lastSegment === '_key'
    )
  }

  return false
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

    if (affectsRootMembership(operation)) {
      editor.rootKeysVerifiedUnique = false
    }
  })

  return () => {
    unsubscribeNormalizationLog?.()
    unsubscribeIndexMaps()
  }
}
