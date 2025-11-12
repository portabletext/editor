import {flatten} from 'lodash'
import {Editor, Operation, Transforms} from 'slate'
import {debugWithName} from '../internal-utils/debug'
import type {BehaviorOperationImplementation} from '../operations/behavior.operations'
import {getRemotePatches} from './remote-patches'
import {pluginUndoing, setIsUndoing} from './slate-plugin.undoing'
import {
  pluginWithoutHistory,
  setWithHistory,
} from './slate-plugin.without-history'
import {transformOperation} from './transform-operation'

const debug = debugWithName('behavior.operation.history.undo')

export const historyUndoOperationImplementation: BehaviorOperationImplementation<
  'history.undo'
> = ({operation}) => {
  const editor = operation.editor
  const {undos} = editor.history
  const remotePatches = getRemotePatches(editor)

  if (undos.length > 0) {
    const step = undos[undos.length - 1]
    debug('Undoing', step)
    if (step.operations.length > 0) {
      const otherPatches = remotePatches.filter(
        (item) => item.time >= step.timestamp,
      )
      let transformedOperations = step.operations
      otherPatches.forEach((item) => {
        transformedOperations = flatten(
          transformedOperations.map((op) =>
            transformOperation(
              editor,
              item.patch,
              op,
              item.snapshot,
              item.previousSnapshot,
            ),
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
        remotePatches.splice(0, remotePatches.length)
        Transforms.deselect(editor)
        editor.history = {undos: [], redos: []}
        setWithHistory(editor, true)
        setIsUndoing(editor, false)
        editor.onChange()
        return
      }
      editor.history.redos.push(step)
      editor.history.undos.pop()
    }
  }
}
