import type {Editor} from 'slate'
import type {EditorActor} from '../editor-machine'

export function createWithEventListeners(editorActor: EditorActor) {
  return function withEventListeners(editor: Editor) {
    const {deleteBackward, insertBreak, insertSoftBreak, insertText} = editor

    editor.deleteBackward = (unit) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete backward',
          unit,
          default: () => deleteBackward(unit),
        },
        editor,
      })
      return
    }

    editor.insertBreak = () => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert break',
          default: insertBreak,
        },
        editor,
      })
      return
    }

    editor.insertSoftBreak = () => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert soft break',
          default: insertSoftBreak,
        },
        editor,
      })
      return
    }

    editor.insertText = (text, options) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert text',
          text,
          default: () => insertText(text, options),
        },
        editor,
      })
      return
    }

    return editor
  }
}
