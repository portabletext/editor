import type {EditorContext} from '../editor/editor-snapshot'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export function updateValuePlugin(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextSlateEditor,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    if (editor.isNormalizingNode) {
      debug.normalization(`(slate operation)\n${safeStringify(operation, 2)}`)
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

    apply(operation)

    buildIndexMaps(
      {
        schema: context.schema,
        value: editor.children,
      },
      {
        blockIndexMap: editor.blockIndexMap,
        listIndexMap: editor.listIndexMap,
      },
    )
  }

  return editor
}
