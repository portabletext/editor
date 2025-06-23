import {applyOperationToPortableText} from '../../internal-utils/apply-operation-to-portable-text'
import {buildIndexMaps} from '../../internal-utils/build-index-maps'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorContext} from '../editor-snapshot'

export function pluginUpdateValue(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextSlateEditor,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    if (operation.type === 'set_selection') {
      apply(operation)
      return
    }

    editor.value = applyOperationToPortableText(
      context,
      editor.value,
      operation,
    )

    const {blockIndexMap, listIndexMap} = buildIndexMaps(context, editor.value)
    editor.blockIndexMap = blockIndexMap
    editor.listIndexMap = listIndexMap

    apply(operation)
  }

  return editor
}
