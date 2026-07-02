import type {EditorSnapshot, Path} from '@portabletext/editor'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {
  isTable,
  type Cell,
  type Table,
  type TableSelection,
} from './behaviors/types'
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

export type ResolvedTableSelection = {
  tableSelection: TableSelection
  table: {node: Table; path: Path}
}

/**
 * `getTableSelection` together with the table node it targets, so behaviors
 * acting on the rectangle don't have to re-resolve the table. Returns
 * `undefined` for an ordinary single-cell selection.
 */
export function resolveTableSelection(
  snapshot: EditorSnapshot,
): ResolvedTableSelection | undefined {
  const tableSelection = getTableSelection(snapshot)
  if (!tableSelection) {
    return undefined
  }
  const table = getEnclosingBlock(snapshot, tableSelection.tablePath, {
    match: isTable,
  })
  if (!table) {
    return undefined
  }
  return {tableSelection, table}
}

/**
 * The cells inside the rectangle, in row-major order, each with its keyed
 * path.
 */
export function* memberCells(
  tableSelection: TableSelection,
  table: Table,
): Generator<{node: Cell; path: Path}> {
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex++) {
    const row = table.rows[rowIndex]
    if (!row) {
      continue
    }
    for (let colIndex = colStart; colIndex <= colEnd; colIndex++) {
      const cell = row.cells[colIndex]
      if (!cell) {
        continue
      }
      yield {
        node: cell,
        path: [
          ...tableSelection.tablePath,
          'rows',
          {_key: row._key},
          'cells',
          {_key: cell._key},
        ],
      }
    }
  }
}
