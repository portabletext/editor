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
          case 'delete.block': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'delete.block',
                blockPath: event.blockPath,
              },
              editor,
            })
            break
          }
          case 'delete.text': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'delete.text',
                anchor: event.anchor,
                focus: event.focus,
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
          case 'insert.span': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'insert.span',
                text: event.text,
                annotations: event.annotations,
                decorators: event.decorators,
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
          case 'move.block': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'move.block',
                at: event.at,
                to: event.to,
              },
              editor,
            })
            break
          }
          case 'move.block down': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'move.block down',
                at: event.at,
              },
              editor,
            })
            break
          }
          case 'move.block up': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {
                type: 'move.block up',
                at: event.at,
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
          case 'select.next block': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: event,
              editor,
            })
            break
          }
          case 'select.previous block': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: event,
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
          case 'text block.set': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: event,
              editor,
            })
            break
          }
          case 'text block.unset': {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: event,
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
      insertData,
      insertSoftBreak,
      insertText,
      select,
      setFragmentData,
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

    editor.insertData = (dataTransfer) => {
      if (isApplyingBehaviorActions(editor)) {
        insertData(dataTransfer)
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'deserialize',
          dataTransfer,
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
        defaultActionCallback: () => {
          insertText(text, options)
        },
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
        defaultActionCallback: () => {
          select(location)
        },
      })
      return
    }

    editor.setFragmentData = (dataTransfer, originEvent) => {
      if (originEvent === 'drag') {
        setFragmentData(dataTransfer)
        return
      }

      if (isApplyingBehaviorActions(editor)) {
        setFragmentData(dataTransfer)
        return
      }

      dataTransfer.clearData()

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'serialize',
          dataTransfer,
          originEvent: originEvent ?? 'unknown',
        },
        editor,
      })
      return
    }

    return editor
  }
}
