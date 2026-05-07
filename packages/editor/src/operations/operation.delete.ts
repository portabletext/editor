import {resolveSelection} from '../internal-utils/apply-selection'
import {deleteCollapsed} from '../internal-utils/delete-collapsed'
import {deleteRange} from '../internal-utils/delete-range'
import {findCurrentLineRange} from '../internal-utils/find-current-line-range'
import {unsetMatchedNodesInRange} from '../internal-utils/unset-matched-in-range'
import {unwrapContainer} from '../internal-utils/unwrap-container'
import {getAncestor} from '../node-traversal/get-ancestor'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNode} from '../node-traversal/get-node'
import {isBlock} from '../node-traversal/is-block'
import {isEmptyContainer} from '../node-traversal/is-empty-container'
import {isInline} from '../node-traversal/is-inline'
import {isEditableContainer} from '../schema/is-editable-container'
import {range as editorRange} from '../slate/editor/range'
import {unhangRange} from '../slate/editor/unhang-range'
import {isObjectNode} from '../slate/node/is-object-node'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {commonPath} from '../slate/path/common-path'
import {pathEquals} from '../slate/path/path-equals'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {rangeEdges} from '../slate/range/range-edges'
import type {OperationImplementation} from './operation.types'

export const deleteOperationImplementation: OperationImplementation<
  'delete'
> = ({operation}) => {
  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : operation.editor.selection

  if (!at) {
    throw new Error('Unable to delete without a selection')
  }

  const [start, end] = rangeEdges(at, operation.editor)

  if (operation.unit === 'block') {
    unsetMatchedNodesInRange(
      operation.editor,
      start.path,
      end.path,
      (_node, path) => isBlock(operation.editor, path),
    )
    return
  }

  if (operation.unit === 'child') {
    unsetMatchedNodesInRange(
      operation.editor,
      start.path,
      end.path,
      (_node, path) => isInline(operation.editor, path),
    )
    return
  }

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const parentBlockEntry = pathEquals(at.anchor.path, at.focus.path)
      ? getAncestorTextBlock(operation.editor, at.anchor.path)
      : (() => {
          const fromPath = commonPath(at.anchor.path, at.focus.path)
          const nodeEntry = getNode(operation.editor, fromPath)
          if (
            nodeEntry &&
            isTextBlockNode({schema: operation.editor.schema}, nodeEntry.node)
          ) {
            return nodeEntry
          }
          return getAncestorTextBlock(operation.editor, fromPath)
        })()

    if (parentBlockEntry) {
      const parentElementRange = editorRange(
        operation.editor,
        parentBlockEntry.path,
        at.anchor,
      )
      const currentLineRange = findCurrentLineRange(
        operation.editor,
        parentElementRange,
      )
      if (!isCollapsedRange(currentLineRange)) {
        deleteRange(operation.editor, currentLineRange, {
          selection: 'preserve',
          removeEmptyStartBlock: true,
        })
        return
      }
    }
  }

  const direction: 'forward' | 'backward' =
    operation.direction === 'backward' ? 'backward' : 'forward'
  const selection: 'collapse-to-start' | 'preserve' = operation.at
    ? 'preserve'
    : 'collapse-to-start'

  if (isCollapsedRange(at)) {
    const enclosingContainer = getAncestor(
      operation.editor,
      at.anchor.path,
      (node, path) =>
        isObjectNode(operation.editor, node) &&
        isEditableContainer(operation.editor, node, path),
    )
    if (
      enclosingContainer &&
      isEmptyContainer(operation.editor, enclosingContainer.path)
    ) {
      unwrapContainer(
        operation.editor,
        enclosingContainer.path,
        operation.direction === 'backward' ? 'before' : 'after',
      )
      return
    }
  }

  if (operation.unit === 'word' && isCollapsedRange(at)) {
    deleteCollapsed(operation.editor, at.anchor, {
      unit: 'word',
      direction,
      selection: 'preserve',
    })
    return
  }

  if (isCollapsedRange(at)) {
    deleteCollapsed(operation.editor, at.anchor, {
      unit: 'character',
      direction,
      selection,
    })
    return
  }

  deleteRange(operation.editor, unhangRange(operation.editor, at), {
    selection,
    removeEmptyStartBlock: true,
  })
}
