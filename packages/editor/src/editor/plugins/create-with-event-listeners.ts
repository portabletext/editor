import {Editor} from 'slate'
import {slateRangeToSelection} from '../../internal-utils/slate-utils'
import {insertTextOperationImplementation} from '../../operations/behavior.operation.insert.text'
import {performOperation} from '../../operations/behavior.operations'
import type {EditorActor} from '../editor-machine'
import {isApplyingBehaviorOperations} from '../with-applying-behavior-operations'

export function createWithEventListeners(editorActor: EditorActor) {
  return function withEventListeners(editor: Editor) {
    if (editorActor.getSnapshot().context.maxBlocks !== undefined) {
      return editor
    }

    const {delete: editorDelete, select} = editor

    editor.delete = (options) => {
      if (isApplyingBehaviorOperations(editor)) {
        editorDelete(options)
        return
      }

      const at = options?.at ?? editor.selection

      if (!at) {
        console.error('Unexpected call to .delete(...) without `at` option')
        return
      }

      const range = Editor.range(editor, at)

      const selection = slateRangeToSelection({
        schema: editorActor.getSnapshot().context.schema,
        editor,
        range,
      })

      if (!selection) {
        console.error(
          'Unexpected call to .delete(...) with invalid `at` option',
        )
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete',
          at: selection,
          direction: options?.reverse ? 'backward' : 'forward',
          unit: options?.unit,
        },
        editor,
      })
    }

    editor.deleteBackward = (unit) => {
      if (isApplyingBehaviorOperations(editor)) {
        console.error('Unexpected call to .deleteBackward(...)')
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
      if (isApplyingBehaviorOperations(editor)) {
        console.error('Unexpected call to .deleteForward(...)')
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
      if (isApplyingBehaviorOperations(editor)) {
        console.error('Unexpected call to .insertBreak(...)')
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
      if (isApplyingBehaviorOperations(editor)) {
        console.error('Unexpected call to .insertData(...)')
        return
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
      if (isApplyingBehaviorOperations(editor)) {
        insertTextOperationImplementation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          operation: {type: 'insert.text', text: '\n', editor},
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

    editor.insertText = (text) => {
      if (isApplyingBehaviorOperations(editor)) {
        insertTextOperationImplementation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          operation: {type: 'insert.text', text, editor},
        })
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
      if (isApplyingBehaviorOperations(editor)) {
        performOperation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          operation: {
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
      if (isApplyingBehaviorOperations(editor)) {
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
      console.error('Unexpected call to .setFragmentData(...)')
      return
    }

    editor.undo = () => {
      if (isApplyingBehaviorOperations(editor)) {
        performOperation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: editorActor.getSnapshot().context.schema,
          },
          operation: {
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
