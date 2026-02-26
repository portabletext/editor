import {applyDeselect} from '../internal-utils/apply-selection'
import {transformOperation} from '../internal-utils/transform-operation'
import {Editor, Operation} from '../slate'
import {pluginUndoing} from '../slate-plugins/slate-plugin.undoing'
import {pluginWithoutHistory} from '../slate-plugins/slate-plugin.without-history'
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
        .map(Operation.inverse)
        .reverse()

      try {
        Editor.withoutNormalizing(editor, () => {
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
        return
      }
      editor.history.redos.push(step)
      editor.history.undos.pop()
    }
  }
}
