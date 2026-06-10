import {subscribeToOperations} from '../../core/operation-channel'
import type {Editor} from '../../interfaces/editor'
import {isPoint} from '../../point/is-point'
import {
  transformPendingPoint,
  transformPendingRange,
  transformTextDiff,
  type TextDiff,
} from '../utils/diff-text'
import type {DOMEditor} from './dom-editor'

/**
 * `withDOM` adds DOM specific behaviors to the editor.
 */

export const withDOM = <T extends Editor>(editor: T): T & DOMEditor => {
  const e = editor as T & DOMEditor
  const {onChange} = e

  // Initialize DOMEditor state properties
  e.isNodeMapDirty = false
  e.domWindow = null
  e.domElement = null

  e.readOnly = false
  e.focused = false
  e.composing = false
  e.userSelection = null
  e.onContextChange = null
  e.scheduleFlush = null
  e.pendingDiffs = []
  e.pendingAction = null
  e.pendingSelection = null
  e.forceRender = null

  subscribeToOperations(
    e,
    (event) => {
      const operation = event.operation

      const pendingDiffs = e.pendingDiffs
      if (pendingDiffs?.length) {
        const transformed = pendingDiffs
          .map((textDiff) => transformTextDiff(textDiff, operation))
          .filter(Boolean) as TextDiff[]

        e.pendingDiffs = transformed
      }

      const pendingSelection = e.pendingSelection
      if (pendingSelection) {
        e.pendingSelection = transformPendingRange(
          e,
          pendingSelection,
          operation,
        )
      }

      const pendingAction = e.pendingAction
      if (pendingAction?.at) {
        const at = isPoint(pendingAction?.at)
          ? transformPendingPoint(e, pendingAction.at, operation)
          : transformPendingRange(e, pendingAction.at, operation)

        e.pendingAction = at ? {...pendingAction, at} : null
      }

      if (operation.type === 'set.selection') {
        // Selection was manually set, don't restore the user selection after the change.
        e.userSelection?.unref()
        e.userSelection = null
      }
    },
    {phase: 'before'},
  )

  // Subscribed at engine creation, so this runs first among `after`
  // listeners — `isNodeMapDirty` must be set before patch generation
  // notifies synchronous `internal.patch` consumers.
  subscribeToOperations(e, (event) => {
    switch (event.operation.type) {
      case 'insert':
      case 'unset':
      case 'insert.text':
      case 'remove.text':
      case 'set.selection': {
        // FIXME: Rename to something like IS_DOM_EDITOR_DESYNCED
        // to better reflect reality, see #5792
        e.isNodeMapDirty = true
      }
    }
  })

  e.onChange = (options) => {
    const onContextChange = e.onContextChange

    if (onContextChange) {
      onContextChange(options)
    }

    onChange(options)
  }

  return e
}
