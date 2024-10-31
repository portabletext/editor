import type {Editor} from 'slate'
import type {EditorActor} from '../editor-machine'

export function createWithEventListeners(editorActor: EditorActor) {
  return function withEventListeners(editor: Editor) {
    editor.deleteBackward = (unit) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete backward',
          unit,
        },
        editor,
      })
      return
    }

    editor.deleteForward = (unit) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete forward',
          unit,
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
          options,
        },
        editor,
      })
      return
    }

    return editor
  }
}
