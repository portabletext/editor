import type {Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  memberCells,
  resolveTableSelection,
  type ResolvedTableSelection,
} from '../get-table-selection'
import {cellValue, rowCells, tableRows, type TableConfig} from '../table-config'

/**
 * Intercepts `delete` and `split` when the editor selection spans more
 * than one table cell. Cells inside the rectangular cell selection get
 * cleared to a single empty text block and the selection collapses to
 * the start of the top-left cell. Within a single cell, the engine's
 * built-in behavior is unchanged.
 */
export function createDeleteBehaviors(config: TableConfig) {
  return [
    defineBehavior<Record<string, never>, 'delete', {tablePath: Path}>({
      on: 'delete',
      guard: ({snapshot, event}) => {
        if (event.direction === undefined) {
          // Bare `delete`s come from decompositions (typing, paste, cut) that
          // replace the rectangle's content. Only explicit delete gestures
          // (Backspace, Delete) remove the table.
          return false
        }
        const resolved = resolveTableSelection(snapshot, config)
        if (!resolved) {
          return false
        }
        const [rowStart, rowEnd] = resolved.tableSelection.rowRange
        const [colStart, colEnd] = resolved.tableSelection.colRange
        const rows = tableRows(config, resolved.table.node)
        const columnCount = Math.max(
          ...rows.map((row) => rowCells(config, row).length),
        )
        const wholeTable =
          rowStart === 0 &&
          colStart === 0 &&
          rowEnd === rows.length - 1 &&
          colEnd === columnCount - 1
        return wholeTable ? {tablePath: resolved.table.path} : false
      },
      actions: [(_, {tablePath}) => [raise({type: 'unset', at: tablePath})]],
    }),
    defineBehavior<Record<string, never>, 'delete', ResolvedTableSelection>({
      on: 'delete',
      guard: ({snapshot, event}) => {
        if (event.at) {
          // Addressed deletes target their own range (the whole-table
          // removal above decomposes into one); only selection-scoped
          // deletes clear the rectangle.
          return false
        }
        return resolveTableSelection(snapshot, config) ?? false
      },
      actions: [(_, resolved) => clearCellsAndCollapse(config, resolved)],
    }),
    defineBehavior<Record<string, never>, 'split', ResolvedTableSelection>({
      on: 'split',
      guard: ({snapshot}) => resolveTableSelection(snapshot, config) ?? false,
      actions: [(_, resolved) => clearCellsAndCollapse(config, resolved)],
    }),
  ]
}

function clearCellsAndCollapse(
  config: TableConfig,
  {tableSelection, table}: ResolvedTableSelection,
) {
  // Unset every block inside each cell's `value` array. Targeting keyed
  // child paths (rather than the whole `value` field) keeps inverse
  // data attached to each operation, so `history.undo` restores the
  // original content. Normalization repopulates each cleared cell with a
  // single empty text block.
  const actions = []
  let topLeftCellPath: Path | null = null
  for (const cell of memberCells(tableSelection, table.node, config)) {
    if (topLeftCellPath === null) {
      topLeftCellPath = cell.path
    }
    for (const block of cellValue(config, cell.node)) {
      actions.push(
        raise({
          type: 'unset',
          at: [...cell.path, config.valueField, {_key: block._key}],
        }),
      )
    }
  }
  if (topLeftCellPath) {
    // Raise select.block (not select with a leaf path): the cleared cell's
    // replacement block does not exist yet. The select operation repairs the
    // emptied cell, minting its empty block, and resolves to the minted
    // leaf, so the cursor lands inside the cleared cell.
    actions.push(
      raise({type: 'select.block', at: topLeftCellPath, select: 'start'}),
    )
  }
  return actions
}
