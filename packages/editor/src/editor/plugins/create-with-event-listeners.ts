import {Editor} from 'slate'
import {insertSoftBreakActionImplementation} from '../../behavior-actions/behavior.action.insert-break'
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

    const {
      deleteBackward,
      deleteForward,
      insertBreak,
      insertData,
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
