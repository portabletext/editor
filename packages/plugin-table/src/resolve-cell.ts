import type {EditorSnapshot, Path} from '@portabletext/editor'
import {getEnclosingBlock, getParent} from '@portabletext/editor/traversal'
import {
  isCell,
  isRow,
  isTable,
  type CellNode,
  type RowNode,
  type TableNode,
} from './behaviors/types'

/**
 * Resolves the table cell enclosing `path`, together with its row and table.
 * Returns `undefined` when `path` isn't inside a cell.
 */
export function resolveCell(
  snapshot: EditorSnapshot,
  path: Path,
):
  | {
      cell: {node: CellNode; path: Path}
      row: {node: RowNode; path: Path}
      table: {node: TableNode; path: Path}
    }
  | undefined {
  const cell = getEnclosingBlock(snapshot, path, {match: isCell})
  const row = cell && getParent(snapshot, cell.path, {match: isRow})
  const table = row && getParent(snapshot, row.path, {match: isTable})
  if (!cell || !row || !table) {
    return undefined
  }
  return {cell, row, table}
}
