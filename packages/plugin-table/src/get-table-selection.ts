import type {EditorSnapshot, Path} from '@portabletext/editor'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import type {CellNode, TableNode, TableSelection} from './behaviors/types'
import {resolveCell} from './resolve-cell'
import {
  createTableGuards,
  defaultTableConfig,
  rowCells,
  tableRows,
  type TableConfig,
} from './table-config'

/**
 * Derives a rectangular table selection from the linear editor selection.
 *
 * Returns `undefined` when:
 * - the selection is null
 * - both endpoints resolve to the same cell (ordinary linear selection)
 * - either endpoint is outside any cell
 * - endpoints resolve to cells in different tables
 *
 * @public
 */
export function getTableSelection(
  snapshot: EditorSnapshot,
  config: TableConfig = defaultTableConfig,
): TableSelection | undefined {
  const selection = snapshot.context.selection
  if (!selection) {
    return undefined
  }

  const anchor = resolveCell(snapshot, selection.anchor.path, config)
  const focus = resolveCell(snapshot, selection.focus.path, config)
  if (!anchor || !focus) {
    return undefined
  }
  if (anchor.cell.node._key === focus.cell.node._key) {
    return undefined
  }
  if (anchor.table.node._key !== focus.table.node._key) {
    return undefined
  }

  const rows = tableRows(config, anchor.table.node)
  const anchorRowIndex = rows.findIndex(
    (row) => row._key === anchor.row.node._key,
  )
  const focusRowIndex = rows.findIndex(
    (row) => row._key === focus.row.node._key,
  )
  const anchorColIndex = rowCells(config, anchor.row.node).findIndex(
    (cell) => cell._key === anchor.cell.node._key,
  )
  const focusColIndex = rowCells(config, focus.row.node).findIndex(
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
  table: {node: TableNode; path: Path}
}

/**
 * `getTableSelection` together with the table node it targets, so behaviors
 * acting on the rectangle don't have to re-resolve the table. Returns
 * `undefined` for an ordinary single-cell selection.
 */
export function resolveTableSelection(
  snapshot: EditorSnapshot,
  config: TableConfig = defaultTableConfig,
): ResolvedTableSelection | undefined {
  const tableSelection = getTableSelection(snapshot, config)
  if (!tableSelection) {
    return undefined
  }
  const table = getEnclosingBlock(snapshot, tableSelection.tablePath, {
    match: createTableGuards(config).isTable,
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
  table: TableNode,
  config: TableConfig = defaultTableConfig,
): Generator<{node: CellNode; path: Path}> {
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex++) {
    const row = tableRows(config, table)[rowIndex]
    if (!row) {
      continue
    }
    for (let colIndex = colStart; colIndex <= colEnd; colIndex++) {
      const cell = rowCells(config, row)[colIndex]
      if (!cell) {
        continue
      }
      yield {
        node: cell,
        path: [
          ...tableSelection.tablePath,
          config.rowsField,
          {_key: row._key},
          config.cellsField,
          {_key: cell._key},
        ],
      }
    }
  }
}
