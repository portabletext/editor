import {Editor, Path} from 'slate'
import {debugWithName} from '../../internal-utils/debug'
import {isChangingRemotely} from '../../internal-utils/withChanges'
import {isRedoing, isUndoing} from '../../internal-utils/withUndoRedo'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {SlateTextBlock, VoidElement} from '../../types/slate'
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
        const node = op.node as SlateTextBlock | VoidElement
        if (op.path[0] === 0 && Editor.isVoid(editor, node)) {
          // Check next path, if it exists, do nothing
          const nextPath = Path.next(op.path)
          // Is removing the first block which is a void (not a text block), add a new empty text block in it, if there is no other element in the next path
          if (!editor.children[nextPath[0]]) {
            debug('Adding placeholder block')
            Editor.insertNode(
              editor,
              editor.pteCreateTextBlock({decorators: []}),
            )
          }
        }
      }
      apply(op)
    }
    return editor
  }
}
