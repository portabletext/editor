import {subscribeToOperations} from '../engine/core/operation-channel'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorContext} from './editor-snapshot'

/**
 * Keeps `blockIndexMap` and `listIndexMap` in sync with the value. Rebuilds
 * them synchronously within the apply that changed the value, so subsequent
 * operations and readers never observe stale maps.
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

    if (operation.type === 'set_selection') {
      return
    }

    if (operation.type === 'insert_text' || operation.type === 'remove_text') {
      // Inserting and removing text has no effect on index maps so there is
      // no need to rebuild those.
      return
    }

    // Operations deep inside blocks (path length > 2) only modify nested
    // structure and cannot affect root-level blockIndexMap or listIndexMap.
    // Root-level inserts/removes are already handled incrementally by
    // applyOperation, so we only need a full rebuild for operations at or
    // near the root level.
    if (operation.path.length <= 2) {
      buildIndexMaps(
        {
          schema: context.schema,
          value: editor.snapshot.context.value,
        },
        {
          blockIndexMap: editor.blockIndexMap,
          listIndexMap: editor.listIndexMap,
        },
      )
    }
  })

  return () => {
    unsubscribeNormalizationLog?.()
    unsubscribeIndexMaps()
  }
}
