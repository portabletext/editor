import {applyOperationToPortableText} from '../../internal-utils/apply-operation-to-portable-text'
import {buildListIndexMap} from '../../internal-utils/build-list-index-map'
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

    editor.blockIndexMap.clear()
    editor.value.forEach((block, index) => {
      editor.blockIndexMap.set(block._key, index)
    })
    editor.listIndexMap = buildListIndexMap(context, editor.value)

    apply(operation)
  }

  return editor
}
