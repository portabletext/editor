import {wholeNodeGuardState} from '../internal-utils/whole-node-guard-state'
import {getValue} from '../internal-utils/get-value'
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

    if ((import.meta.env.VITE_HISTORY_CHECK === '1' || wholeNodeGuardState.enabled)) {
      const operations = [...step.operations].reverse()
      const checked = new Set<string>()
      for (const operation of operations) {
        if (operation.type === 'set.selection') continue
        const targetPath = operation.type === 'insert' && operation.inverse ? operation.inverse.path : operation.path
        const identity = JSON.stringify(targetPath)
        if (checked.has(identity)) continue
        checked.add(identity)
        const expected = (operation as any).historyExpected?.after
        const target = getValue(editor.snapshot.context.value, targetPath as never)
        const actual = operation.type === 'insert.text' || operation.type === 'remove.text' ? (target as any)?.text : target
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          console.log('HISTORY_DROP ' + JSON.stringify({direction: 'undo', path: targetPath, expected, actual}))
          editor.history.undos.pop()
          return
        }
      }
    }

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
