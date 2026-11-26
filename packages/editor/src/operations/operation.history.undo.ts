import {pluginUndoing} from '../engine-plugins/engine-plugin.undoing'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {inverseOperation} from '../engine/operation/inverse-operation'
import {applyDeselect} from '../internal-utils/apply-selection'
import type {OperationImplementation} from './operation.types'

export const historyUndoOperationImplementation: OperationImplementation<
  'history.undo'
> = ({operation}) => {
  const editor = operation.editor
  const {undos} = editor.history

  if (undos.length > 0) {
    const step = undos[undos.length - 1]!

    if (step.operations.length > 0) {
      const reversedOperations = step.operations.map(inverseOperation).reverse()

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

        applyDeselect(editor)
        editor.history = {undos: [], redos: []}
        editor.onChange()
        return
      }
      editor.history.redos.push(step)
      editor.history.undos.pop()
    }
  }
}
