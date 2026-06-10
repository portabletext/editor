import type {EditorContext} from '../editor/editor-snapshot'
import {buildListIndexMap} from '../internal-utils/build-index-maps'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {transformBlockIndexMap} from '../internal-utils/transform-block-index-map'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export function updateValuePlugin(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextEditorEngine,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    if (editor.isNormalizingNode) {
      if (debug.normalization.enabled) {
        debug.normalization(
          `((engine operation))\n${safeStringify(operation, 2)}`,
        )
      }
    }

    if (operation.type === 'set_selection') {
      apply(operation)
      return
    }

    if (operation.type === 'insert_text' || operation.type === 'remove_text') {
      // Inserting and removing text has no effect on index maps so there is
      // no need to rebuild those.
      apply(operation)
      return
    }

    const beforeValue = editor.snapshot.context.value
    apply(operation)
    const afterValue = editor.snapshot.context.value

    transformBlockIndexMap(
      editor.blockIndexMap,
      operation,
      beforeValue,
      afterValue,
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
  }

  return editor
}
