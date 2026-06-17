import {subscribeToOperations} from '../engine/core/operation-channel'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {transformBlockIndexMap} from '../internal-utils/transform-block-index-map'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorContext} from './editor-snapshot'

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
  })

  return () => {
    unsubscribeNormalizationLog?.()
    unsubscribeIndexMaps()
  }
}
