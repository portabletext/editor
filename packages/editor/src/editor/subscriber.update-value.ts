import {subscribeToOperations} from '../engine/core/operation-channel'
import {buildListIndexMap} from '../internal-utils/build-index-maps'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {transformBlockIndexMap} from '../internal-utils/transform-block-index-map'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorContext} from './editor-snapshot'

/**
 * Keeps `blockIndexMap` and `listIndexMap` in sync with the value.
 * `blockIndexMap` is transformed incrementally per operation;
 * `listIndexMap` is rebuilt because list-item numbering depends on
 * root-block adjacency, which any shallow op can disturb non-locally.
 * Both update synchronously within the apply that changed the value, so
 * subsequent operations and readers never observe stale maps.
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

    // List index can only change as a result of root-level insert/remove or
    // a property change on a root block. Deeper ops cannot shift list
    // indexes.
    if (operation.path.length <= 2) {
      buildListIndexMap(
        {
          schema: context.schema,
          value: editor.snapshot.context.value,
          containers: editor.snapshot.context.containers,
        },
        editor.listIndexMap,
      )
    }
  })

  return () => {
    unsubscribeNormalizationLog?.()
    unsubscribeIndexMaps()
  }
}
