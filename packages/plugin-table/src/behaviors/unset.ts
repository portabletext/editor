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
import {
  createTableGuards,
  defaultTableConfig,
  rowCells,
  tableRows,
  type TableConfig,
} from '../table-config'
import {alignmentRemoveAction} from './alignment'
import type {TableNode} from './types'

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

export function createUnsetBehaviors(config: TableConfig) {
  const {isCell, isRow, isTable} = createTableGuards(config)
  return [
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
        const rows = tableRows(config, table.node)
        const rowIndex = rows.findIndex(
          (row) => row._key === enclosingRow.node._key,
        )
        if (rowIndex === -1) {
          return false
        }
        const neighborRow = rows[rowIndex + 1] ?? rows[rowIndex - 1]
        if (!neighborRow) {
          return false
        }
        const enclosingCell = getEnclosingBlock(snapshot, event.at, {
          match: isCell,
        })
        const columnIndex = enclosingCell
          ? rowCells(config, enclosingRow.node).findIndex(
              (cell) => cell._key === enclosingCell.node._key,
            )
          : 0
        const safeColumnIndex = Math.min(
          Math.max(columnIndex, 0),
          rowCells(config, neighborRow).length - 1,
        )
        const neighborCell = rowCells(config, neighborRow).at(safeColumnIndex)
        if (!neighborCell) {
          return false
        }
        const neighborCellPath: Path = [
          ...table.path,
          config.rowsField,
          {_key: neighborRow._key},
          config.cellsField,
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
        table: TableNode
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
        const columnIndex = rowCells(config, enclosingRow.node).findIndex(
          (cell) => cell._key === enclosingCell.node._key,
        )
        if (columnIndex === -1) {
          return false
        }
        const table = getParent(snapshot, enclosingRow.path, {match: isTable})
        if (!table) {
          return false
        }
        if (rowCells(config, enclosingRow.node).length <= 1) {
          return false
        }
        const neighborColumnIndex =
          columnIndex + 1 < rowCells(config, enclosingRow.node).length
            ? columnIndex + 1
            : columnIndex - 1
        const neighborCell = rowCells(config, enclosingRow.node).at(
          neighborColumnIndex,
        )
        if (!neighborCell) {
          return false
        }
        const neighborCellPath: Path = [
          ...enclosingRow.path,
          config.cellsField,
          {_key: neighborCell._key},
        ]
        const cellPaths = tableRows(config, table.node).flatMap((row) => {
          const cellAtColumn = rowCells(config, row).at(columnIndex)
          if (!cellAtColumn) {
            return []
          }
          return [
            [
              ...table.path,
              config.rowsField,
              {_key: row._key},
              config.cellsField,
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
}

export const unsetBehaviors = createUnsetBehaviors(defaultTableConfig)
