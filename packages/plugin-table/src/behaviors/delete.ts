import type {Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  memberCells,
  resolveTableSelection,
  type ResolvedTableSelection,
} from '../get-table-selection'

/**
 * Intercepts `delete` and `split` when the editor selection spans more
 * than one table cell. Cells inside the rectangular cell selection get
 * cleared to a single empty text block and the selection collapses to
 * the start of the top-left cell. Within a single cell, the engine's
 * built-in behavior is unchanged.
 */
export const deleteBehaviors = [
  defineBehavior<Record<string, never>, 'delete', ResolvedTableSelection>({
    on: 'delete',
    guard: ({snapshot}) => resolveTableSelection(snapshot) ?? false,
    actions: [(_, resolved) => clearCellsAndCollapse(resolved)],
  }),
  defineBehavior<Record<string, never>, 'split', ResolvedTableSelection>({
    on: 'split',
    guard: ({snapshot}) => resolveTableSelection(snapshot) ?? false,
    actions: [(_, resolved) => clearCellsAndCollapse(resolved)],
  }),
]

function clearCellsAndCollapse({
  tableSelection,
  table,
}: ResolvedTableSelection) {
  // Unset every block inside each cell's `value` array. Targeting keyed
  // child paths (rather than the whole `value` field) keeps inverse
  // data attached to each operation, so `history.undo` restores the
  // original content. Normalization repopulates each cleared cell with a
  // single empty text block.
  const actions = []
  let topLeftCellPath: Path | null = null
  for (const cell of memberCells(tableSelection, table.node)) {
    if (topLeftCellPath === null) {
      topLeftCellPath = cell.path
    }
    for (const block of cell.node.value) {
      actions.push(
        raise({
          type: 'unset',
          at: [...cell.path, 'value', {_key: block._key}],
        }),
      )
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
