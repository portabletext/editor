import type {
  EditorSelection,
  EditorSelectionPoint,
  Path,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  getEnclosingBlock,
  getLeaf,
  getParent,
  getSibling,
  pathContains,
} from '@portabletext/editor/traversal'
import {alignmentRemoveAction} from './alignment'
import {isCell, isRow, isTable, type Table} from './types'

function selectionTouches(
  selection: EditorSelection,
  paths: Array<Path>,
): boolean {
  if (!selection) {
    return false
  }
  return paths.some(
    (path) =>
      pathContains(path, selection.anchor.path) ||
      pathContains(path, selection.focus.path),
  )
}

export const unsetBehaviors = [
  defineBehavior<
    {at: Path},
    'custom.unset.row',
    {
      rowPath: Path
      columnIndex: number
      neighborCellPath: Path
    }
  >({
    on: 'custom.unset.row',
    guard: ({snapshot, event}) => {
      const enclosingRow = getEnclosingBlock(snapshot, event.at, {
        match: isRow,
      })
      if (!enclosingRow) {
        return false
      }
      const table = getParent(snapshot, enclosingRow.path, {match: isTable})
      if (!table) {
        return false
      }
      const rowIndex = table.node.rows.findIndex(
        (row) => row._key === enclosingRow.node._key,
      )
      if (rowIndex === -1) {
        return false
      }
      const neighborRow =
        table.node.rows[rowIndex + 1] ?? table.node.rows[rowIndex - 1]
      if (!neighborRow) {
        return false
      }
      const enclosingCell = getEnclosingBlock(snapshot, event.at, {
        match: isCell,
      })
      const columnIndex = enclosingCell
        ? enclosingRow.node.cells.findIndex(
            (cell) => cell._key === enclosingCell.node._key,
          )
        : 0
      const safeColumnIndex = Math.min(
        Math.max(columnIndex, 0),
        neighborRow.cells.length - 1,
      )
      const neighborCell = neighborRow.cells.at(safeColumnIndex)
      if (!neighborCell) {
        return false
      }
      const neighborCellPath: Path = [
        ...table.path,
        'rows',
        {_key: neighborRow._key},
        'cells',
        {_key: neighborCell._key},
      ]
      return {
        rowPath: enclosingRow.path,
        columnIndex: safeColumnIndex,
        neighborCellPath,
      }
    },
    actions: [
      ({snapshot}, {rowPath, neighborCellPath}) => {
        const actions = [raise({type: 'unset', at: rowPath})]
        if (selectionTouches(snapshot.context.selection, [rowPath])) {
          const leaf = getLeaf(snapshot, neighborCellPath, {edge: 'start'})
          if (leaf) {
            const point: EditorSelectionPoint = {path: leaf.path, offset: 0}
            actions.push(
              raise({type: 'select', at: {anchor: point, focus: point}}),
            )
          }
        }
        return actions
      },
    ],
  }),
  defineBehavior<
    {at: Path},
    'custom.unset.column',
    {
      cellPaths: Array<Path>
      neighborCellPath: Path
      table: Table
      tablePath: Path
      columnIndex: number
    }
  >({
    on: 'custom.unset.column',
    guard: ({snapshot, event}) => {
      const enclosingCell = getEnclosingBlock(snapshot, event.at, {
        match: isCell,
      })
      if (!enclosingCell) {
        return false
      }
      const enclosingRow = getParent(snapshot, enclosingCell.path, {
        match: isRow,
      })
      if (!enclosingRow) {
        return false
      }
      const columnIndex = enclosingRow.node.cells.findIndex(
        (cell) => cell._key === enclosingCell.node._key,
      )
      if (columnIndex === -1) {
        return false
      }
      const table = getParent(snapshot, enclosingRow.path, {match: isTable})
      if (!table) {
        return false
      }
      if (enclosingRow.node.cells.length <= 1) {
        return false
      }
      const neighborColumnIndex =
        columnIndex + 1 < enclosingRow.node.cells.length
          ? columnIndex + 1
          : columnIndex - 1
      const neighborCell = enclosingRow.node.cells.at(neighborColumnIndex)
      if (!neighborCell) {
        return false
      }
      const neighborCellPath: Path = [
        ...enclosingRow.path,
        'cells',
        {_key: neighborCell._key},
      ]
      const cellPaths = table.node.rows.flatMap((row) => {
        const cellAtColumn = row.cells.at(columnIndex)
        if (!cellAtColumn) {
          return []
        }
        return [
          [
            ...table.path,
            'rows',
            {_key: row._key},
            'cells',
            {_key: cellAtColumn._key},
          ] satisfies Path,
        ]
      })
      return {
        cellPaths,
        neighborCellPath,
        table: table.node,
        tablePath: table.path,
        columnIndex,
      }
    },
    actions: [
      (
        {snapshot},
        {cellPaths, neighborCellPath, table, tablePath, columnIndex},
      ) => {
        const actions = cellPaths.map((cellPath) =>
          raise({type: 'unset', at: cellPath}),
        )
        const alignmentAction = alignmentRemoveAction(
          table,
          tablePath,
          columnIndex,
        )
        if (alignmentAction) {
          actions.push(alignmentAction)
        }
        if (selectionTouches(snapshot.context.selection, cellPaths)) {
          const leaf = getLeaf(snapshot, neighborCellPath, {edge: 'start'})
          if (leaf) {
            const point: EditorSelectionPoint = {path: leaf.path, offset: 0}
            actions.push(
              raise({type: 'select', at: {anchor: point, focus: point}}),
            )
          }
        }
        return actions
      },
    ],
  }),
  defineBehavior<
    {at: Path},
    'custom.unset.table',
    {tablePath: Path; neighborBlockPath: Path | undefined}
  >({
    on: 'custom.unset.table',
    guard: ({snapshot, event}) => {
      const enclosingTable = getEnclosingBlock(snapshot, event.at, {
        match: isTable,
      })
      if (!enclosingTable) {
        return false
      }
      const nextSibling = getSibling(snapshot, enclosingTable.path, {
        direction: 'next',
      })
      const previousSibling = getSibling(snapshot, enclosingTable.path, {
        direction: 'previous',
      })
      return {
        tablePath: enclosingTable.path,
        neighborBlockPath: nextSibling?.path ?? previousSibling?.path,
      }
    },
    actions: [
      ({snapshot}, {tablePath, neighborBlockPath}) => {
        const actions = [raise({type: 'unset', at: tablePath})]
        if (
          neighborBlockPath &&
          selectionTouches(snapshot.context.selection, [tablePath])
        ) {
          const leaf = getLeaf(snapshot, neighborBlockPath, {edge: 'start'})
          if (leaf) {
            const point: EditorSelectionPoint = {path: leaf.path, offset: 0}
            actions.push(
              raise({type: 'select', at: {anchor: point, focus: point}}),
            )
          }
        }
        return actions
      },
    ],
  }),
]
