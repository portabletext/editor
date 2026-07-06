import type {EditorSelectionPoint, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {resolveCell} from '../resolve-cell'
import {
  createTableGuards,
  rowCells,
  tableRows,
  type TableConfig,
} from '../table-config'
import {alignmentInsertAction} from './alignment'
import type {RowNode, TableNode} from './types'

export function createInsertBehaviors(config: TableConfig) {
  const {isRow, isTable} = createTableGuards(config)
  return [
    defineBehavior<
      {at: Path; position: 'before' | 'after'},
      'custom.insert.row',
      {row: RowNode; rowPath: Path}
    >({
      on: 'custom.insert.row',
      guard: ({snapshot, event}) => {
        const enclosingRow = getEnclosingBlock(snapshot, event.at, {
          match: isRow,
        })
        if (enclosingRow) {
          return {row: enclosingRow.node, rowPath: enclosingRow.path}
        }
        const enclosingTable = getEnclosingBlock(snapshot, event.at, {
          match: isTable,
        })
        if (!enclosingTable) {
          return false
        }
        const edgeRow =
          event.position === 'before'
            ? tableRows(config, enclosingTable.node).at(0)
            : tableRows(config, enclosingTable.node).at(-1)
        if (!edgeRow) {
          return false
        }
        return {
          row: edgeRow,
          rowPath: [
            ...enclosingTable.path,
            config.rowsField,
            {_key: edgeRow._key},
          ],
        }
      },
      actions: [
        ({event}, {row, rowPath}) => {
          const point: EditorSelectionPoint = {path: rowPath, offset: 0}
          return [
            raise({
              type: 'insert.block',
              block: {
                _type: config.rowType,
                [config.cellsField]: rowCells(config, row).map(() => ({
                  _type: config.cellType,
                })),
              },
              placement: event.position,
              select: 'none',
              at: {anchor: point, focus: point},
            }),
          ]
        },
      ],
    }),
    defineBehavior<
      {at: Path; position: 'before' | 'after'},
      'custom.insert.column',
      {table: TableNode; tablePath: Path; columnIndex: number}
    >({
      on: 'custom.insert.column',
      guard: ({snapshot, event}) => {
        const resolved = resolveCell(snapshot, event.at, config)
        if (resolved) {
          const columnIndex = rowCells(config, resolved.row.node).findIndex(
            (cell) => cell._key === resolved.cell.node._key,
          )
          if (columnIndex === -1) {
            return false
          }
          return {
            table: resolved.table.node,
            tablePath: resolved.table.path,
            columnIndex,
          }
        }
        const enclosingTable = getEnclosingBlock(snapshot, event.at, {
          match: isTable,
        })
        if (!enclosingTable) {
          return false
        }
        const firstRow = tableRows(config, enclosingTable.node).at(0)
        if (!firstRow) {
          return false
        }
        const columnIndex =
          event.position === 'before'
            ? 0
            : rowCells(config, firstRow).length - 1
        return {
          table: enclosingTable.node,
          tablePath: enclosingTable.path,
          columnIndex,
        }
      },
      actions: [
        ({event}, {table, tablePath, columnIndex}) => {
          const insertActions = tableRows(config, table).flatMap((row) => {
            const cellAtColumn = rowCells(config, row).at(columnIndex)
            if (!cellAtColumn) {
              return []
            }
            const cellPath: Path = [
              ...tablePath,
              config.rowsField,
              {_key: row._key},
              config.cellsField,
              {_key: cellAtColumn._key},
            ]
            const point: EditorSelectionPoint = {path: cellPath, offset: 0}
            return [
              raise({
                type: 'insert.block',
                block: {_type: config.cellType},
                placement: event.position,
                select: 'none',
                at: {anchor: point, focus: point},
              }),
            ]
          })
          const newColumnIndex =
            event.position === 'before' ? columnIndex : columnIndex + 1
          const alignmentAction = alignmentInsertAction(
            table,
            tablePath,
            newColumnIndex,
          )
          return alignmentAction
            ? [...insertActions, alignmentAction]
            : insertActions
        },
      ],
    }),
  ]
}
