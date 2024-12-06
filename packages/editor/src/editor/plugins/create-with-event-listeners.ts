import type {Editor} from 'slate'
import type {EditorActor} from '../editor-machine'

export function createWithEventListeners(
  editorActor: EditorActor,
  subscriptions: Array<() => () => void>,
) {
  return function withEventListeners(editor: Editor) {
    if (editorActor.getSnapshot().context.maxBlocks !== undefined) {
      return editor
    }

    subscriptions.push(() => {
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
          case 'blur': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'blur',
              },
              editor,
            })
            break
          }
          case 'decorator.add': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'decorator.add',
                decorator: event.decorator,
              },
              editor,
            })
            break
          }
          case 'decorator.remove': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'decorator.remove',
                decorator: event.decorator,
              },
              editor,
            })
            break
          }
          case 'decorator.toggle': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'decorator.toggle',
                decorator: event.decorator,
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
          case 'insert.block object': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'insert.block object',
                placement: event.placement,
                blockObject: event.blockObject,
              },
              editor,
            })
            break
          }
          case 'insert.inline object': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'insert.inline object',
                inlineObject: event.inlineObject,
              },
              editor,
            })
            break
          }
          case 'list item.toggle': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'list item.toggle',
                listItem: event.listItem,
              },
              editor,
            })
            break
          }
          case 'style.toggle': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'style.toggle',
                style: event.style,
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
          type: 'delete.backward',
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
          type: 'delete.forward',
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
          type: 'insert.break',
        },
        editor,
      })
      return
    }

    editor.insertSoftBreak = () => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.soft break',
        },
        editor,
      })
      return
    }

    editor.insertText = (text, options) => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.text',
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
