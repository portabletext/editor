import type {EditorSnapshot} from '@portabletext/editor'
import {getEnclosingBlock, getParent} from '@portabletext/editor/traversal'
import {isCell, isRow, isTable, type TableSelection} from './behaviors/types'

/**
 * Derives a rectangular table selection from the linear editor selection.
 *
 * Returns `undefined` when:
 * - the selection is null
 * - both endpoints resolve to the same cell (ordinary linear selection)
 * - either endpoint is outside any cell
 * - endpoints resolve to cells in different tables
 *
 * @alpha
 */
export function getTableSelection(
  snapshot: EditorSnapshot,
): TableSelection | undefined {
  const selection = snapshot.context.selection
  if (!selection) {
    return undefined
  }

  const anchorCell = getEnclosingBlock(snapshot, selection.anchor.path, {
    match: isCell,
  })
  const focusCell = getEnclosingBlock(snapshot, selection.focus.path, {
    match: isCell,
  })
  if (!anchorCell || !focusCell) {
    return undefined
  }
  if (anchorCell.node._key === focusCell.node._key) {
    return undefined
  }

  const anchorRow = getParent(snapshot, anchorCell.path, {match: isRow})
  const focusRow = getParent(snapshot, focusCell.path, {match: isRow})
  if (!anchorRow || !focusRow) {
    return undefined
  }

  const anchorTable = getParent(snapshot, anchorRow.path, {match: isTable})
  const focusTable = getParent(snapshot, focusRow.path, {match: isTable})
  if (!anchorTable || !focusTable) {
    return undefined
  }
  if (anchorTable.node._key !== focusTable.node._key) {
    return undefined
  }

  const anchorRowIndex = anchorTable.node.rows.findIndex(
    (row) => row._key === anchorRow.node._key,
  )
  const focusRowIndex = anchorTable.node.rows.findIndex(
    (row) => row._key === focusRow.node._key,
  )
  const anchorColIndex = anchorRow.node.cells.findIndex(
    (cell) => cell._key === anchorCell.node._key,
  )
  const focusColIndex = focusRow.node.cells.findIndex(
    (cell) => cell._key === focusCell.node._key,
  )
  if (
    anchorRowIndex === -1 ||
    focusRowIndex === -1 ||
    anchorColIndex === -1 ||
    focusColIndex === -1
  ) {
    return undefined
  }

  return {
    tablePath: anchorTable.path,
    rowRange: [
      Math.min(anchorRowIndex, focusRowIndex),
      Math.max(anchorRowIndex, focusRowIndex),
    ],
    colRange: [
      Math.min(anchorColIndex, focusColIndex),
      Math.max(anchorColIndex, focusColIndex),
    ],
  }
}
