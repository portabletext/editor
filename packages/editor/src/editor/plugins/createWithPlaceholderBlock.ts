import {Editor} from 'slate'
import {debugWithName} from '../../internal-utils/debug'
import {isChangingRemotely} from '../../internal-utils/withChanges'
import {isRedoing, isUndoing} from '../../internal-utils/withUndoRedo'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

const debug = debugWithName('plugin:withPlaceholderBlock')

/**
 * Keep a "placeholder" block present when the editor is empty
 *
 */
export function createWithPlaceholderBlock(
  editorActor: EditorActor,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withPlaceholderBlock(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const {apply} = editor

    editor.apply = (op) => {
      if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
        apply(op)
        return
      }

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

      if (op.type === 'remove_node') {
        const blockIndex = op.path.at(0)
        const isLonelyBlock =
          op.path.length === 1 &&
          blockIndex === 0 &&
          editor.children.length === 1
        const isBlockObject =
          op.node._type !== editorActor.getSnapshot().context.schema.block.name

        if (isLonelyBlock && isBlockObject) {
          debug('Adding placeholder block')
          Editor.insertNode(editor, editor.pteCreateTextBlock({decorators: []}))
        }
      }

      apply(op)
    }

    return editor
  }
}
