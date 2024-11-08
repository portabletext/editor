import type {Editor} from 'slate'
import type {EditorActor} from '../editor-machine'

export function createWithEventListeners(editorActor: EditorActor) {
  return function withEventListeners(editor: Editor) {
    editor.subscriptions.push(() => {
      const subscription = editorActor.on('*', (event) => {
        switch (event.type) {
          case 'annotation.add': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'annotation.add',
                annotation: event.annotation,
              },
              editor,
            })
            break
          }
          case 'annotation.remove': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'annotation.remove',
                annotation: event.annotation,
              },
              editor,
            })
            break
          }
          case 'annotation.toggle': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'annotation.toggle',
                annotation: event.annotation,
              },
              editor,
            })
            break
          }
          case 'focus': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'focus',
              },
              editor,
            })
            break
          }
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    })

    editor.addMark = (mark) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'decorator.add',
          decorator: mark,
        },
        editor,
      })
      return
    }

    editor.removeMark = (mark) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'decorator.remove',
          decorator: mark,
        },
        editor,
      })
      return
    }

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
