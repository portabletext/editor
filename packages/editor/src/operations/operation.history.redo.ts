import {applyDeselect} from '../internal-utils/apply-selection'
import {transformOperation} from '../internal-utils/transform-operation'
import {Editor} from '../slate'
import {pluginRedoing} from '../slate-plugins/slate-plugin.redoing'
import {pluginWithoutHistory} from '../slate-plugins/slate-plugin.without-history'
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
          transformOperation(
            editor,
            item.patch,
            op,
            item.snapshot,
            item.previousSnapshot,
          ),
        )
      })
      try {
        Editor.withoutNormalizing(editor, () => {
          pluginRedoing(editor, () => {
            pluginWithoutHistory(editor, () => {
              transformedOperations.forEach((op) => {
                editor.apply(op)
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
        editor.withHistory = true
        editor.isRedoing = false
        editor.onChange()
        return
      }
      editor.history.undos.push(step)
      editor.history.redos.pop()
    }
  }
}
