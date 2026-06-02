import {isTextBlock} from '@portabletext/schema'
import {range as editorRange} from '../engine/editor/range'
import {unhangRange} from '../engine/editor/unhang-range'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {commonPath} from '../engine/path/common-path'
import {pathEquals} from '../engine/path/path-equals'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {rangeEdges} from '../engine/range/range-edges'
import {resolveSelection} from '../internal-utils/apply-selection'
import {deleteCollapsed} from '../internal-utils/delete-collapsed'
import {deleteRange} from '../internal-utils/delete-range'
import {findCurrentLineRange} from '../internal-utils/find-current-line-range'
import {unsetMatchedNodesInRange} from '../internal-utils/unset-matched-in-range'
import {unwrapContainer} from '../internal-utils/unwrap-container'
import {isEditableContainer} from '../schema/is-editable-container'
import {getAncestor} from '../traversal/get-ancestor'
import {getChildren} from '../traversal/get-children'
import {getNode} from '../traversal/get-node'
import {getParent} from '../traversal/get-parent'
import {isBlock} from '../traversal/is-block'
import {isInline} from '../traversal/is-inline'
import {isObject} from '../traversal/is-object'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import type {OperationImplementation} from './operation.types'

export const deleteOperationImplementation: OperationImplementation<
  'delete'
> = ({operation}) => {
  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : operation.editor.snapshot.context.selection

  if (!at) {
    throw new Error('Unable to delete without a selection')
  }

  const [start, end] = rangeEdges(at, operation.editor.snapshot.context)

  if (operation.unit === 'block') {
    unsetMatchedNodesInRange(
      operation.editor,
      start.path,
      end.path,
      (_, path) => isBlock(operation.editor.snapshot, path),
    )
    return
  }

  if (operation.unit === 'child') {
    unsetMatchedNodesInRange(
      operation.editor,
      start.path,
      end.path,
      (_, path) => isInline(operation.editor.snapshot, path),
    )
    return
  }

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const parentBlockEntry = pathEquals(at.anchor.path, at.focus.path)
      ? getParent(operation.editor.snapshot, at.anchor.path, {
          match: (node) =>
            isTextBlock(
              {schema: operation.editor.snapshot.context.schema},
              node,
            ),
        })
      : (() => {
          const fromPath = commonPath(at.anchor.path, at.focus.path)
          const nodeEntry = getNode(operation.editor.snapshot, fromPath)
          if (
            nodeEntry &&
            isTextBlockNode(
              {schema: operation.editor.snapshot.context.schema},
              nodeEntry.node,
            )
          ) {
            return nodeEntry
          }
          return getParent(operation.editor.snapshot, fromPath, {
            match: (node) =>
              isTextBlock(
                {schema: operation.editor.snapshot.context.schema},
                node,
              ),
          })
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
      operation.editor.snapshot,
      at.anchor.path,
      {
        match: (node, path) =>
          isObject(operation.editor.snapshot, node) &&
          isEditableContainer(operation.editor.snapshot, node, path),
      },
    )
    const enclosingContainerChildren = enclosingContainer
      ? getChildren(operation.editor.snapshot, enclosingContainer.path)
      : undefined
    const [firstChild] = enclosingContainerChildren ?? []
    if (
      enclosingContainer &&
      enclosingContainerChildren?.length === 1 &&
      firstChild &&
      isEmptyTextBlock(operation.editor.snapshot.context, firstChild.node)
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

  deleteRange(operation.editor, unhangRange(operation.editor.snapshot, at), {
    selection,
    removeEmptyStartBlock: true,
  })
}
