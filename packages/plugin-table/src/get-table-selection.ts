import type {EditorSnapshot} from '@portabletext/editor'
import type {TableSelection} from './behaviors/types'
import {resolveCell} from './resolve-cell'

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

  const anchor = resolveCell(snapshot, selection.anchor.path)
  const focus = resolveCell(snapshot, selection.focus.path)
  if (!anchor || !focus) {
    return undefined
  }
  if (anchor.cell.node._key === focus.cell.node._key) {
    return undefined
  }
  if (anchor.table.node._key !== focus.table.node._key) {
    return undefined
  }

  const anchorRowIndex = anchor.table.node.rows.findIndex(
    (row) => row._key === anchor.row.node._key,
  )
  const focusRowIndex = anchor.table.node.rows.findIndex(
    (row) => row._key === focus.row.node._key,
  )
  const anchorColIndex = anchor.row.node.cells.findIndex(
    (cell) => cell._key === anchor.cell.node._key,
  )
  const focusColIndex = focus.row.node.cells.findIndex(
    (cell) => cell._key === focus.cell.node._key,
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
    tablePath: anchor.table.path,
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
