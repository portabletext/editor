import {pluginRedoing} from '../engine-plugins/engine-plugin.redoing'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {applyDeselect} from '../internal-utils/apply-selection'
import type {OperationImplementation} from './operation.types'

export const historyRedoOperationImplementation: OperationImplementation<
  'history.redo'
> = ({operation}) => {
  const editor = operation.editor
  const {redos} = editor.history

  if (redos.length > 0) {
    const step = redos[redos.length - 1]!

    if (step.operations.length > 0) {
      try {
        withoutNormalizing(editor, () => {
          pluginRedoing(editor, () => {
            pluginWithoutHistory(editor, () => {
              step.operations.forEach((op) => {
                editor.apply(op)
              })
            })
          })
        })
      } catch (err) {
        console.error(
          `Could not perform 'history.redo' operation: ${err instanceof Error ? err.message : err}`,
        )

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
