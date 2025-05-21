import {getMarkState} from '../../internal-utils/mark-state'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorContext} from '../editor-snapshot'

export function pluginUpdateMarkState(
  context: Pick<EditorContext, 'schema'>,
  editor: PortableTextSlateEditor,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    apply(operation)

    editor.markState = getMarkState({
      editor,
      schema: context.schema,
    })
  }

  return editor
}
