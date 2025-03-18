import {Editor} from 'slate'
import {insertSoftBreakActionImplementation} from '../../behavior-actions/behavior.action.insert-break'
import {performAction} from '../../behavior-actions/behavior.actions'
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
          // These events are not relevant for Behaviors
          case 'blurred':
          case 'done loading':
          case 'editable':
          case 'error':
          case 'focused':
          case 'invalid value':
          case 'loading':
          case 'mutation':
          case 'patch':
          case 'internal.patch':
          case 'patches':
          case 'read only':
          case 'ready':
          case 'selection':
          case 'value changed':
          case 'unset':
            break

          case 'custom.*':
            editorActor.send({
              type: 'custom behavior event',
              behaviorEvent: event.event,
              editor,
            })
            break

          default:
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: event,
              editor,
            })
            break
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    })

    const {deleteBackward, deleteForward, insertBreak, insertText, select} =
      editor

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
        throw new Error('Unexpected call to .insertData(...)')
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'input.*',
          originEvent: {
            dataTransfer,
          },
        },
        editor,
      })
    }

    editor.insertSoftBreak = () => {
      if (isApplyingBehaviorActions(editor)) {
        insertSoftBreakActionImplementation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          action: {type: 'insert.soft break', editor},
        })
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

    editor.redo = () => {
      if (isApplyingBehaviorActions(editor)) {
        performAction({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          action: {
            type: 'history.redo',
            editor,
          },
        })
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.redo',
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
        defaultActionCallback: () => {
          select(location)
        },
      })
      return
    }

    editor.setFragmentData = () => {
      console.warn('Unexpected call to .setFragmentData(...)')
      return
    }

    editor.undo = () => {
      if (isApplyingBehaviorActions(editor)) {
        performAction({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          action: {
            type: 'history.undo',
            editor,
          },
        })
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.undo',
        },
        editor,
      })
      return
    }

    return editor
  }
}
