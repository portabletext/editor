import {wholeNodeGuardState} from '../internal-utils/whole-node-guard-state'
import {getValue} from '../internal-utils/get-value'
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

    if ((import.meta.env.VITE_HISTORY_CHECK === '1' || wholeNodeGuardState.enabled)) {
      const operations = step.operations
      const checked = new Set<string>()
      for (const operation of operations) {
        if (operation.type === 'set.selection') continue
        const targetPath = operation.type === 'insert' && operation.inverse ? operation.inverse.path : operation.path
        const identity = JSON.stringify(targetPath)
        if (checked.has(identity)) continue
        checked.add(identity)
        const expected = (operation as any).historyExpected?.before
        const target = getValue(editor.snapshot.context.value, targetPath as never)
        const actual = operation.type === 'insert.text' || operation.type === 'remove.text' ? (target as any)?.text : target
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          console.log('HISTORY_DROP ' + JSON.stringify({direction: 'redo', path: targetPath, expected, actual}))
          editor.history.redos.pop()
          return
        }
      }
    }

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
