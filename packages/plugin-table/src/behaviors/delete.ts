import type {
  EditorSelectionPoint,
  EditorSnapshot,
  Path,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getEnclosingBlock, getLeaf} from '@portabletext/editor/traversal'
import {getTableSelection} from '../derivation'
import {isTable, type TableSelection} from './types'

/**
 * Intercepts `delete` and `split` when the editor selection spans more
 * than one table cell. Cells inside the rectangular cell selection get
 * cleared to a single empty text block and the selection collapses to
 * the start of the top-left cell. Within a single cell, the engine's
 * built-in behavior is unchanged.
 */
export const deleteBehaviors = [
  defineBehavior<Record<string, never>, 'delete', TableSelection>({
    on: 'delete',
    guard: ({snapshot}) => getTableSelection(snapshot) ?? false,
    actions: [
      ({snapshot}, tableSelection) =>
        clearCellsAndCollapse(snapshot, tableSelection),
    ],
  }),
  defineBehavior<Record<string, never>, 'split', TableSelection>({
    on: 'split',
    guard: ({snapshot}) => getTableSelection(snapshot) ?? false,
    actions: [
      ({snapshot}, tableSelection) =>
        clearCellsAndCollapse(snapshot, tableSelection),
    ],
  }),
]

function clearCellsAndCollapse(
  snapshot: EditorSnapshot,
  tableSelection: TableSelection,
) {
  const table = getEnclosingBlock(snapshot, tableSelection.tablePath, {
    match: isTable,
  })
  if (!table) {
    return []
  }
  // Unset every block inside each cell's `content` array. Targeting keyed
  // child paths (rather than the whole `content` field) keeps inverse
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
      for (const block of cell.content) {
        actions.push(
          raise({
            type: 'unset',
            at: [...cellPath, 'content', {_key: block._key}],
          }),
        )
      }
    }
  }
  if (topLeftCellPath) {
    const leaf = getLeaf(snapshot, topLeftCellPath, {edge: 'start'})
    if (leaf) {
      const point: EditorSelectionPoint = {path: leaf.path, offset: 0}
      actions.push(raise({type: 'select', at: {anchor: point, focus: point}}))
    }
  }
  return actions
}
