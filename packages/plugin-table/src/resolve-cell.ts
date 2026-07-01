import type {EditorSnapshot, Path} from '@portabletext/editor'
import {getEnclosingBlock, getParent} from '@portabletext/editor/traversal'
import {
  isCell,
  isRow,
  isTable,
  type Cell,
  type Row,
  type Table,
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
      cell: {node: Cell; path: Path}
      row: {node: Row; path: Path}
      table: {node: Table; path: Path}
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
