import type {ApplyContextFrame} from '../engine/core/apply-context'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {withChangeUnit} from './engine-plugin.change-unit'

export function withRemoteChanges(
  editor: PortableTextEditorEngine,
  source: Extract<ApplyContextFrame, {kind: 'remote'}>['source'],
  fn: () => void,
): void {
  withChangeUnit(editor, () => {
    editor.applyContext.push(Object.freeze({kind: 'remote', source}))
    try {
      fn()
    } finally {
      editor.applyContext.pop()
    }
  })
}
