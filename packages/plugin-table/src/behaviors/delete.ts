import type {EditorSnapshot, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {getTableSelection} from '../get-table-selection'
import {isTable, type Table, type TableSelection} from './types'

type ClearableSelection = {
  tableSelection: TableSelection
  table: {node: Table; path: Path}
}

/**
 * Resolve a rectangular cell selection together with its table node, so the
 * action doesn't have to re-resolve the table. Returns `false` for an
 * ordinary single-cell selection.
 */
function clearableSelection(
  snapshot: EditorSnapshot,
): ClearableSelection | false {
  const tableSelection = getTableSelection(snapshot)
  if (!tableSelection) {
    return false
  }
  const table = getEnclosingBlock(snapshot, tableSelection.tablePath, {
    match: isTable,
  })
  if (!table) {
    return false
  }
  return {tableSelection, table}
}

/**
 * Intercepts `delete` and `split` when the editor selection spans more
 * than one table cell. Cells inside the rectangular cell selection get
 * cleared to a single empty text block and the selection collapses to
 * the start of the top-left cell. Within a single cell, the engine's
 * built-in behavior is unchanged.
 */
export const deleteBehaviors = [
  defineBehavior<Record<string, never>, 'delete', ClearableSelection>({
    on: 'delete',
    guard: ({snapshot}) => clearableSelection(snapshot),
    actions: [
      (_, {tableSelection, table}) =>
        clearCellsAndCollapse(tableSelection, table),
    ],
  }),
  defineBehavior<Record<string, never>, 'split', ClearableSelection>({
    on: 'split',
    guard: ({snapshot}) => clearableSelection(snapshot),
    actions: [
      (_, {tableSelection, table}) =>
        clearCellsAndCollapse(tableSelection, table),
    ],
  }),
]

function clearCellsAndCollapse(
  tableSelection: TableSelection,
  table: {node: Table; path: Path},
) {
  // Unset every block inside each cell's `value` array. Targeting keyed
  // child paths (rather than the whole `value` field) keeps inverse
  // data attached to each operation, so `history.undo` restores the
  // original content. Normalization repopulates each cleared cell with a
  // single empty text block.
  const actions = []
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  let topLeftCellPath: Path | null = null
  for (let r = rowStart; r <= rowEnd; r++) {
    const row = table.node.rows[r]
    if (!row) {
      continue
    }
    for (let c = colStart; c <= colEnd; c++) {
      const cell = row.cells[c]
      if (!cell) {
        continue
      }
      const cellPath: Path = [
        ...tableSelection.tablePath,
        'rows',
        {_key: row._key},
        'cells',
        {_key: cell._key},
      ]
      if (topLeftCellPath === null) {
        topLeftCellPath = cellPath
      }
      for (const block of cell.value) {
        actions.push(
          raise({
            type: 'unset',
            at: [...cellPath, 'value', {_key: block._key}],
          }),
        )
      }
    }
  }
  if (topLeftCellPath) {
    // Raise select.block (not select with leaf path). select.block resolves
    // to the cell's first leaf via the apply layer AFTER our unsets +
    // normalization complete — so the cursor lands inside the cleared cell's
    // freshly-minted empty block, not at whatever leaf survived transformPoint.
    actions.push(
      raise({type: 'select.block', at: topLeftCellPath, select: 'start'}),
    )
  }
  return actions
}
