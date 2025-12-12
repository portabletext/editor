import {Editor, Operation, Transforms} from 'slate'
import {pluginUndoing} from '../editor/slate-plugin.undoing'
import {pluginWithoutHistory} from '../editor/slate-plugin.without-history'
import {debugWithName} from '../internal-utils/debug'
import {transformOperation} from '../internal-utils/transform-operation'
import type {BehaviorOperationImplementation} from '../operations/behavior.operations'

const debug = debugWithName('behavior.operation.history.undo')

export const historyUndoOperationImplementation: BehaviorOperationImplementation<
  'history.undo'
> = ({operation}) => {
  const editor = operation.editor
  const {undos} = editor.history

  if (undos.length > 0) {
    const step = undos[undos.length - 1]
    debug('Undoing', step)
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
        debug('Could not perform undo step', err)
        editor.remotePatches.splice(0, editor.remotePatches.length)
        Transforms.deselect(editor)
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
