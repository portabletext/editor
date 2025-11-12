import {flatten} from 'lodash'
import {Editor, Transforms} from 'slate'
import {debugWithName} from '../internal-utils/debug'
import type {BehaviorOperationImplementation} from '../operations/behavior.operations'
import {getRemotePatches} from './remote-patches'
import {pluginRedoing, setIsRedoing} from './slate-plugin.redoing'
import {
  pluginWithoutHistory,
  setWithHistory,
} from './slate-plugin.without-history'
import {transformOperation} from './transform-operation'

const debug = debugWithName('behavior.operation.history.redo')

export const historyRedoOperationImplementation: BehaviorOperationImplementation<
  'history.redo'
> = ({operation}) => {
  const editor = operation.editor
  const {redos} = editor.history
  const remotePatches = getRemotePatches(editor)

  if (redos.length > 0) {
    const step = redos[redos.length - 1]
    debug('Redoing', step)
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
        debug('Could not perform redo step', err)
        remotePatches.splice(0, remotePatches.length)
        Transforms.deselect(editor)
        editor.history = {undos: [], redos: []}
        setWithHistory(editor, true)
        setIsRedoing(editor, false)
        editor.onChange()
        return
      }
      editor.history.undos.push(step)
      editor.history.redos.pop()
    }
  }
}
