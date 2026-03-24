import {applyDeselect} from '../internal-utils/apply-selection'
import {preTransformDecorationsForHistory} from '../internal-utils/pre-transform-decorations-for-history'
import {transformOperation} from '../internal-utils/transform-operation'
import {pluginUndoing} from '../slate-plugins/slate-plugin.undoing'
import {pluginWithoutHistory} from '../slate-plugins/slate-plugin.without-history'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {inverseOperation} from '../slate/operation/inverse-operation'
import type {OperationImplementation} from './operation.types'

export const historyUndoOperationImplementation: OperationImplementation<
  'history.undo'
> = ({operation}) => {
  const editor = operation.editor
  const {undos} = editor.history

  if (undos.length > 0) {
    const step = undos[undos.length - 1]!

    if (step.operations.length > 0) {
      const otherPatches = editor.remotePatches.filter(
        (item) => item.time >= step.timestamp,
      )
      let transformedOperations = step.operations
      otherPatches.forEach((item) => {
        transformedOperations = transformedOperations.flatMap((op) =>
          transformOperation(
            editor,
            item.patch,
            op,
            item.snapshot,
            item.previousSnapshot,
          ),
        )
      })
      const reversedOperations = transformedOperations
        .map(inverseOperation)
        .reverse()

      const cleanup = preTransformDecorationsForHistory(editor, step, 'undo')

      try {
        withoutNormalizing(editor, () => {
          pluginUndoing(editor, () => {
            pluginWithoutHistory(editor, () => {
              reversedOperations.forEach((op) => {
                editor.apply(op)
              })
            })
          })
        })
      } catch (err) {
        console.error(
          `Could not perform 'history.undo' operation: ${err instanceof Error ? err.message : err}`,
        )

        editor.remotePatches.splice(0, editor.remotePatches.length)
        applyDeselect(editor)
        editor.history = {undos: [], redos: []}
        editor.withHistory = true
        editor.isUndoing = false
        editor.onChange()
        cleanup()
        return
      }

      cleanup()
      editor.history.redos.push(step)
      editor.history.undos.pop()
    }
  }
}
