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
          case 'custom.*':
            editorActor.send({
              type: 'custom behavior event',
              behaviorEvent: event.event,
              editor,
            })
            break

          case 'annotation.add':
          case 'annotation.remove':
          case 'annotation.toggle':
          case 'block.set':
          case 'block.unset':
          case 'blur':
          case 'data transfer.set':
          case 'decorator.add':
          case 'decorator.remove':
          case 'decorator.toggle':
          case 'delete.backward':
          case 'delete.block':
          case 'delete.forward':
          case 'delete.text':
          case 'deserialization.failure':
          case 'deserialization.success':
          case 'focus':
          case 'insert.block':
          case 'insert.block object':
          case 'insert.inline object':
          case 'insert.span':
          case 'insert.text block':
          case 'list item.add':
          case 'list item.remove':
          case 'list item.toggle':
          case 'move.block':
          case 'move.block down':
          case 'move.block up':
          case 'select':
          case 'select.next block':
          case 'select.previous block':
          case 'serialization.failure':
          case 'serialization.success':
          case 'style.add':
          case 'style.remove':
          case 'style.toggle':
          case 'text block.set':
          case 'text block.unset':
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
