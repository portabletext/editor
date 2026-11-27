import {pluginRedoing} from '../engine-plugins/engine-plugin.redoing'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {withoutNormalizing} from '../engine/editor/normalize'
import {applyDeselect} from '../internal-utils/apply-selection'
import {transformOperation} from '../internal-utils/transform-operation'
import type {OperationImplementation} from './operation.types'

export const historyRedoOperationImplementation: OperationImplementation<
  'history.redo'
> = ({operation}) => {
  const editor = operation.editor
  const {redos} = editor.history

  if (redos.length > 0) {
    const step = redos[redos.length - 1]!

    if (step.operations.length > 0) {
      const otherPatches = editor.remotePatches.filter(
        (item) => item.time >= step.timestamp,
      )
      let transformedOperations = step.operations
      otherPatches.forEach((item) => {
        transformedOperations = transformedOperations.flatMap((op) =>
          transformOperation(editor, item.patch, op),
        )
      })
      try {
        withoutNormalizing(editor, () => {
          pluginRedoing(editor, () => {
            pluginWithoutHistory(editor, () => {
              transformedOperations.forEach((op) => {
                const replayOperation = {...op}
                if (replayOperation.type === 'insert') {
                  delete replayOperation.patching
                }
                if (
                  op.type === 'insert' &&
                  op.patching === false &&
                  op.path.length === 1 &&
                  editor.snapshot.context.value.length === 0
                ) {
                  editor.applyContext.push(Object.freeze({kind: 'placeholder'}))
                  try {
                    withoutPatching(editor, () => editor.apply(replayOperation))
                  } finally {
                    editor.applyContext.pop()
                  }
                } else {
                  editor.apply(replayOperation)
                }
              })
            })
          })
        })
      } catch (err) {
        console.error(
          `Could not perform 'history.redo' operation: ${err instanceof Error ? err.message : err}`,
        )

        editor.remotePatches.splice(0, editor.remotePatches.length)
        applyDeselect(editor)
        editor.history = {undos: [], redos: []}
        editor.onChange()
        return
      }
      editor.history.undos.push(step)
      editor.history.redos.pop()
    }
  }
}
