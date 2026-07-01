import type {EditorSelectionPoint, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {resolveCell} from '../resolve-cell'
import {alignmentInsertAction} from './alignment'
import {isRow, isTable, type Row, type Table} from './types'

export const insertBehaviors = [
  defineBehavior<
    {at: Path; position: 'before' | 'after'},
    'custom.insert.row',
    {row: Row; rowPath: Path}
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
          ? enclosingTable.node.rows.at(0)
          : enclosingTable.node.rows.at(-1)
      if (!edgeRow) {
        return false
      }
      return {
        row: edgeRow,
        rowPath: [...enclosingTable.path, 'rows', {_key: edgeRow._key}],
      }
    },
    actions: [
      ({event}, {row, rowPath}) => {
        const point: EditorSelectionPoint = {path: rowPath, offset: 0}
        return [
          raise({
            type: 'insert.block',
            block: {
              _type: 'row',
              cells: row.cells.map(() => ({_type: 'cell'})),
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
    {table: Table; tablePath: Path; columnIndex: number}
  >({
    on: 'custom.insert.column',
    guard: ({snapshot, event}) => {
      const resolved = resolveCell(snapshot, event.at)
      if (resolved) {
        const columnIndex = resolved.row.node.cells.findIndex(
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
      const firstRow = enclosingTable.node.rows.at(0)
      if (!firstRow) {
        return false
      }
      const columnIndex =
        event.position === 'before' ? 0 : firstRow.cells.length - 1
      return {
        table: enclosingTable.node,
        tablePath: enclosingTable.path,
        columnIndex,
      }
    },
    actions: [
      ({event}, {table, tablePath, columnIndex}) => {
        const insertActions = table.rows.flatMap((row) => {
          const cellAtColumn = row.cells.at(columnIndex)
          if (!cellAtColumn) {
            return []
          }
          const cellPath: Path = [
            ...tablePath,
            'rows',
            {_key: row._key},
            'cells',
            {_key: cellAtColumn._key},
          ]
          const point: EditorSelectionPoint = {path: cellPath, offset: 0}
          return [
            raise({
              type: 'insert.block',
              block: {_type: 'cell'},
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
