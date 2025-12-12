import {buildIndexMaps} from '../internal-utils/build-index-maps'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorContext} from './editor-snapshot'

export function withIndexMaps(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextSlateEditor,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    if (
      operation.type === 'set_selection' ||
      operation.type === 'insert_text' ||
      operation.type === 'remove_text'
    ) {
      // These operations have no effect on index maps so there is no need to
      // rebuild them.
      apply(operation)
      return
    }

    buildIndexMaps(
      {
        schema: context.schema,
        value: editor.value,
      },
      {
        blockIndexMap: editor.blockIndexMap,
        listIndexMap: editor.listIndexMap,
      },
    )

    apply(operation)
  }

  return editor
}
