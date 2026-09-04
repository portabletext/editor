import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {
  applyDeselect,
  applySelect,
  resolveSelection,
} from '../internal-utils/apply-selection'
import {getContainer} from '../traversal/get-container'
import type {OperationImplementation} from './operation.types'

export const selectOperationImplementation: OperationImplementation<
  'select'
> = ({operation}) => {
  let newSelection = resolveSelection(operation.editor, operation.at)

  if (newSelection) {
    // Point resolution only lands on a container when the container has no
    // leaf to descend into, e.g. a behavior removed every block inside a
    // table cell and selected the cell before normalization minted the
    // replacement block. Storing that point would park the caret where no
    // caret can live, and a following `insert.text` would silently drop its
    // text. Repair the container the way deferred normalization would and
    // resolve again.
    const anchorContainer = getContainer(
      operation.editor.snapshot,
      newSelection.anchor.path,
    )
    const focusContainer = getContainer(
      operation.editor.snapshot,
      newSelection.focus.path,
    )

    const containers = anchorContainer ? [anchorContainer] : []
    if (focusContainer && focusContainer.node !== anchorContainer?.node) {
      containers.push(focusContainer)
    }

    if (containers.length > 0) {
      withoutNormalizing(operation.editor, () => {
        for (const entry of containers) {
          operation.editor.applyContext.push(
            Object.freeze({kind: 'normalization'}),
          )
          try {
            operation.editor.normalizeNode([entry.node, entry.path])
          } finally {
            operation.editor.applyContext.pop()
          }
        }
      })
      newSelection = resolveSelection(operation.editor, operation.at)
    }
  }

  if (newSelection) {
    applySelect(operation.editor, newSelection)
  } else {
    applyDeselect(operation.editor)
  }

  if (operation.editor.focused && operation.editor.snapshot.context.readOnly) {
    operation.editor.focused = false
  }
}
