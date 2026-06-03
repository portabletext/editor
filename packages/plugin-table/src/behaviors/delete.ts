import type {
  EditorSelectionPoint,
  Path,
  PortableTextBlock,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getLeaf} from '@portabletext/editor/traversal'
import {isKeyedSegment} from '@portabletext/editor/utils'
import {getTableSelection} from '../derivation'
import {isTable} from './types'

/**
 * Intercepts `delete` and `split` when the editor selection spans more
 * than one table cell. Cells inside the rectangular cell selection get
 * cleared to a single empty text block and the selection collapses to
 * the start of the top-left cell. Within a single cell, the engine's
 * built-in behavior is unchanged.
 *
 * Why this exists: the table cell selection (the blue rectangle) is a
 * derived view over the editor selection. When the user has the
 * rectangle highlighted and triggers a deletion, they expect the
 * rectangle's cells to be cleared — not for the engine to slice each
 * cell's text at the anchor/focus offsets, which is what the unguarded
 * engine path does.
 */
type RectangleGuard = {tablePath: Path; cellKeys: ReadonlyArray<string>}

export const deleteBehaviors = [
  defineBehavior<Record<string, never>, 'delete', RectangleGuard>({
    on: 'delete',
    guard: ({snapshot}) => guardMultiCellRectangle(snapshot),
    actions: [
      ({snapshot}, {tablePath, cellKeys}) =>
        clearCellsAndCollapse(snapshot, tablePath, cellKeys),
    ],
  }),
  defineBehavior<Record<string, never>, 'split', RectangleGuard>({
    on: 'split',
    guard: ({snapshot}) => guardMultiCellRectangle(snapshot),
    actions: [
      ({snapshot}, {tablePath, cellKeys}) =>
        clearCellsAndCollapse(snapshot, tablePath, cellKeys),
    ],
  }),
]

type Snapshot = Parameters<typeof getTableSelection>[0]

function guardMultiCellRectangle(snapshot: Snapshot): RectangleGuard | false {
  const tableSelection = getTableSelection(snapshot)
  if (!tableSelection) {
    return false
  }
  const table = findTable(snapshot, tableSelection.tablePath)
  if (!table) {
    return false
  }
  const cellKeys: Array<string> = []
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  for (let r = rowStart; r <= rowEnd; r++) {
    const row = table.rows[r]
    if (!row) {
      continue
    }
    for (let c = colStart; c <= colEnd; c++) {
      const cell = row.cells[c]
      if (cell) {
        cellKeys.push(cell._key)
      }
    }
  }
  if (cellKeys.length < 2) {
    return false
  }
  return {tablePath: tableSelection.tablePath, cellKeys}
}

function clearCellsAndCollapse(
  snapshot: Snapshot,
  tablePath: Path,
  cellKeys: ReadonlyArray<string>,
) {
  const table = findTable(snapshot, tablePath)
  if (!table) {
    return []
  }
  const actions = []
  let topLeftCellPath: Path | null = null
  for (const row of table.rows) {
    for (const cell of row.cells) {
      if (cellKeys.includes(cell._key)) {
        const cellContentPath: Path = [
          ...tablePath,
          'rows',
          {_key: row._key},
          'cells',
          {_key: cell._key},
          'content',
        ]
        actions.push(raise({type: 'unset', at: cellContentPath}))
        if (topLeftCellPath === null) {
          topLeftCellPath = [
            ...tablePath,
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
          ]
        }
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

type TableNode = PortableTextBlock & {
  _key: string
  rows: ReadonlyArray<RowNode>
}

type RowNode = {
  _key: string
  cells: ReadonlyArray<CellNode>
}

type CellNode = {
  _key: string
}

function findTable(snapshot: Snapshot, tablePath: Path): TableNode | null {
  const tableSegment = tablePath[0]
  if (!isKeyedSegment(tableSegment)) {
    return null
  }
  const block = snapshot.context.value.find(
    (item) => item._key === tableSegment._key,
  )
  if (!block || !isTable(block)) {
    return null
  }
  return block as TableNode
}
