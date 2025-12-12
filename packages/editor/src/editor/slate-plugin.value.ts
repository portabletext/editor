import {applyOperationToPortableText} from '../internal-utils/apply-operation-to-portable-text'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorContext} from './editor-snapshot'

export function withValue(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextSlateEditor,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    if (operation.type === 'set_selection') {
      // This operation has no effect on the value so we can just apply it directly.
      apply(operation)
      return
    }

    editor.value = applyOperationToPortableText(
      context,
      editor.value,
      operation,
    )

    apply(operation)
  }

  return editor
}
