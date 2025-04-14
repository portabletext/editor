import {Editor} from 'slate'
import {insertTextActionImplementation} from '../../behavior-actions/behavior.action.insert.text'
import {performAction} from '../../behavior-actions/behavior.actions'
import {slateRangeToSelection} from '../../internal-utils/slate-utils'
import type {EditorActor} from '../editor-machine'
import {isApplyingBehaviorActions} from '../with-applying-behavior-actions'

export function createWithEventListeners(editorActor: EditorActor) {
  return function withEventListeners(editor: Editor) {
    if (editorActor.getSnapshot().context.maxBlocks !== undefined) {
      return editor
    }

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
        insertTextActionImplementation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          action: {type: 'insert.text', text: '\n', editor},
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
        },
        editor,
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
          at: slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range,
          }),
        },
        editor,
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
