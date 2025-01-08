import {isChangingRemotely} from '../../internal-utils/withChanges'
import {isRedoing, isUndoing} from '../../internal-utils/withUndoRedo'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

/**
 * This plugin makes sure that the PTE maxBlocks prop is respected
 *
 */
export function createWithMaxBlocks(editorActor: EditorActor) {
  return function withMaxBlocks(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const {apply} = editor
    editor.apply = (operation) => {
      if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
        apply(operation)
        return
      }

      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (isChangingRemotely(editor)) {
        apply(operation)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (isUndoing(editor) || isRedoing(editor)) {
        apply(operation)
        return
      }

      const rows = editorActor.getSnapshot().context.maxBlocks ?? -1
      if (rows > 0 && editor.children.length >= rows) {
        if (
          (operation.type === 'insert_node' ||
            operation.type === 'split_node') &&
          operation.path.length === 1
        ) {
          return
        }
      }
      apply(operation)
    }
    return editor
  }
}
