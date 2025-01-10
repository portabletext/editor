import {Editor} from 'slate'
import {toPortableTextRange} from '../../internal-utils/ranges'
import {fromSlateValue} from '../../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../../internal-utils/weakMaps'
import type {EditorActor} from '../editor-machine'
import {isApplyingBehaviorActions} from '../with-applying-behavior-actions'

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
          case 'custom.*': {
            editorActor.send({
              type: 'custom behavior event',
              behaviorEvent: event.event,
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
          case 'select': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'select',
                selection: event.selection,
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

    const {
      deleteBackward,
      deleteForward,
      insertBreak,
      insertSoftBreak,
      insertText,
      select,
    } = editor

    editor.deleteBackward = (unit) => {
      if (isApplyingBehaviorActions(editor)) {
        deleteBackward(unit)
        return
      }

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
      if (isApplyingBehaviorActions(editor)) {
        deleteForward(unit)
        return
      }

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
      if (isApplyingBehaviorActions(editor)) {
        insertBreak()
        return
      }

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
      if (isApplyingBehaviorActions(editor)) {
        insertSoftBreak()
        return
      }

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
      if (isApplyingBehaviorActions(editor)) {
        insertText(text, options)
        return
      }

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

    editor.select = (location) => {
      if (isApplyingBehaviorActions(editor)) {
        select(location)
        return
      }

      const range = Editor.range(editor, location)

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'select',
          selection: toPortableTextRange(
            fromSlateValue(
              editor.children,
              editorActor.getSnapshot().context.schema.block.name,
              KEY_TO_VALUE_ELEMENT.get(editor),
            ),
            range,
            editorActor.getSnapshot().context.schema,
          ),
        },
        editor,
      })
      return
    }

    return editor
  }
}
