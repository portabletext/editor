import type {PortableTextSlateEditor} from '../../types/editor'
import {isChangingRemotely} from '../../utils/withChanges'
import {isRedoing, isUndoing} from '../../utils/withUndoRedo'
import type {EditorActor} from '../editor-machine'

export function createWithEventListener(
  editorActor: EditorActor,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withEventListener(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const {apply, insertText} = editor

    editor.insertText = (text) => {
      insertText(text)
    }

    editor.apply = (op) => {
      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (isChangingRemotely(editor)) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (isUndoing(editor) || isRedoing(editor)) {
        apply(op)
        return
      }

      if (op.type === 'insert_text') {
        editorActor.send({
          type: 'before:insert text',
          text: op.text,
          editor,
        })
      }

      apply(op)

      if (op.type === 'insert_text') {
        editorActor.send({
          type: 'after:insert text',
          text: op.text,
          editor,
        })
      }
    }

    return editor
  }
}
