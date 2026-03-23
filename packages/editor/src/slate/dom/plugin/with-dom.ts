import type {Editor} from '../../interfaces/editor'
import type {Operation} from '../../interfaces/operation'
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
  const {apply, onChange} = e

  // Initialize DOMEditor state properties
  e.isNodeMapDirty = false
  e.domWindow = null
  e.domElement = null
  e.domPlaceholder = ''
  e.domPlaceholderElement = null

  e.readOnly = false
  e.focused = false
  e.composing = false
  e.userSelection = null
  e.onContextChange = null
  e.scheduleFlush = null
  e.pendingInsertionMarks = null
  e.userMarks = null
  e.pendingDiffs = []
  e.pendingAction = null
  e.pendingSelection = null
  e.forceRender = null

  e.apply = (op: Operation) => {
    const pendingDiffs = e.pendingDiffs
    if (pendingDiffs?.length) {
      const transformed = pendingDiffs
        .map((textDiff) => transformTextDiff(textDiff, op))
        .filter(Boolean) as TextDiff[]

      e.pendingDiffs = transformed
    }

    const pendingSelection = e.pendingSelection
    if (pendingSelection) {
      e.pendingSelection = transformPendingRange(e, pendingSelection, op)
    }

    const pendingAction = e.pendingAction
    if (pendingAction?.at) {
      const at = isPoint(pendingAction?.at)
        ? transformPendingPoint(e, pendingAction.at, op)
        : transformPendingRange(e, pendingAction.at, op)

      e.pendingAction = at ? {...pendingAction, at} : null
    }

    if (op.type === 'set_selection') {
      // Selection was manually set, don't restore the user selection after the change.
      e.userSelection?.unref()
      e.userSelection = null
    }

    apply(op)

    switch (op.type) {
      case 'insert_node':
      case 'remove_node':
      case 'insert_text':
      case 'remove_text':
      case 'set_selection': {
        // FIXME: Rename to something like IS_DOM_EDITOR_DESYNCED
        // to better reflect reality, see #5792
        e.isNodeMapDirty = true
      }
    }
  }

  e.onChange = (options) => {
    const onContextChange = e.onContextChange

    if (onContextChange) {
      onContextChange(options)
    }

    onChange(options)
  }

  return e
}
