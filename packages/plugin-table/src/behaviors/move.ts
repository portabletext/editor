import type {EditorSelection, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getEnclosingBlock, getParent} from '@portabletext/editor/traversal'
import {
  createTableGuards,
  rowCells,
  tableRows,
  type TableConfig,
} from '../table-config'
import {alignmentMoveAction} from './alignment'
import type {TableNode} from './types'

export function createMoveBehaviors(config: TableConfig) {
  const {isCell, isRow, isTable} = createTableGuards(config)
  return [
    defineBehavior<
      {at: Path; to: Path},
      'custom.move.row',
      {
        originRowPath: Path
        destinationRowPath: Path
        savedSelection: EditorSelection | null
      }
    >({
      on: 'custom.move.row',
      guard: ({snapshot, event}) => {
        const originRow = getEnclosingBlock(snapshot, event.at, {match: isRow})
        if (!originRow) {
          return false
        }
        const destinationRow = getEnclosingBlock(snapshot, event.to, {
          match: isRow,
        })
        if (!destinationRow) {
          return false
        }
        if (originRow.node._key === destinationRow.node._key) {
          return false
        }
        const originTable = getParent(snapshot, originRow.path, {
          match: isTable,
        })
        const destinationTable = getParent(snapshot, destinationRow.path, {
          match: isTable,
        })
        if (
          !originTable ||
          !destinationTable ||
          originTable.node._key !== destinationTable.node._key
        ) {
          return false
        }
        return {
          originRowPath: originRow.path,
          destinationRowPath: destinationRow.path,
          savedSelection: snapshot.context.selection,
        }
      },
      actions: [
        (_, {originRowPath, destinationRowPath, savedSelection}) => {
          const actions = [
            raise({
              type: 'move.block',
              at: originRowPath,
              to: destinationRowPath,
            }),
          ]
          if (savedSelection) {
            actions.push(raise({type: 'select', at: savedSelection}))
          }
          return actions
        },
      ],
    }),
    defineBehavior<
      {at: Path; to: Path},
      'custom.move.column',
      {
        table: TableNode
        tablePath: Path
        originIndex: number
        destinationIndex: number
        savedSelection: EditorSelection | null
      }
    >({
      on: 'custom.move.column',
      guard: ({snapshot, event}) => {
        const originCell = getEnclosingBlock(snapshot, event.at, {
          match: isCell,
        })
        if (!originCell) {
          return false
        }
        const destinationCell = getEnclosingBlock(snapshot, event.to, {
          match: isCell,
        })
        if (!destinationCell) {
          return false
        }
        const originRow = getParent(snapshot, originCell.path, {match: isRow})
        const destinationRow = getParent(snapshot, destinationCell.path, {
          match: isRow,
        })
        if (!originRow || !destinationRow) {
          return false
        }
        const originTable = getParent(snapshot, originRow.path, {
          match: isTable,
        })
        const destinationTable = getParent(snapshot, destinationRow.path, {
          match: isTable,
        })
        if (
          !originTable ||
          !destinationTable ||
          originTable.node._key !== destinationTable.node._key
        ) {
          return false
        }
        const originIndex = rowCells(config, originRow.node).findIndex(
          (cell) => cell._key === originCell.node._key,
        )
        const destinationIndex = rowCells(
          config,
          destinationRow.node,
        ).findIndex((cell) => cell._key === destinationCell.node._key)
        if (
          originIndex === -1 ||
          destinationIndex === -1 ||
          originIndex === destinationIndex
        ) {
          return false
        }
        return {
          table: originTable.node,
          tablePath: originTable.path,
          originIndex,
          destinationIndex,
          savedSelection: snapshot.context.selection,
        }
      },
      actions: [
        (
          _,
          {table, tablePath, originIndex, destinationIndex, savedSelection},
        ) => {
          const actions = tableRows(config, table).flatMap((row) => {
            const originCell = rowCells(config, row).at(originIndex)
            const destinationCell = rowCells(config, row).at(destinationIndex)
            if (!originCell || !destinationCell) {
              return []
            }
            const rowPath: Path = [
              ...tablePath,
              config.rowsField,
              {_key: row._key},
            ]
            return [
              raise({
                type: 'move.block',
                at: [...rowPath, config.cellsField, {_key: originCell._key}],
                to: [
                  ...rowPath,
                  config.cellsField,
                  {_key: destinationCell._key},
                ],
              }),
            ]
          })
          const alignmentAction = alignmentMoveAction(
            table,
            tablePath,
            originIndex,
            destinationIndex,
          )
          if (alignmentAction) {
            actions.push(alignmentAction)
          }
          if (savedSelection) {
            actions.push(raise({type: 'select', at: savedSelection}))
          }
          return actions
        },
      ],
    }),
  ]
}
