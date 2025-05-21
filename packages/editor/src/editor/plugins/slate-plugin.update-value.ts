import {applyOperationToPortableText} from '../../internal-utils/apply-operation-to-portable-text'
import {getMarkState} from '../../internal-utils/mark-state'
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
    } else {
      editor.value = applyOperationToPortableText(
        {
          keyGenerator: context.keyGenerator,
          schema: context.schema,
        },
        editor.value,
        operation,
      )

      apply(operation)
    }

    editor.markState = getMarkState({
      editor,
      schema: context.schema,
    })
  }

  return editor
}
