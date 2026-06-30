import type {EditorSelection, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getEnclosingBlock, getParent} from '@portabletext/editor/traversal'
import {alignmentMoveAction} from './alignment'
import {isCell, isRow, isTable, type Table} from './types'

export const moveBehaviors = [
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
      const originTable = getParent(snapshot, originRow.path, {match: isTable})
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
      table: Table
      tablePath: Path
      originIndex: number
      destinationIndex: number
      savedSelection: EditorSelection | null
    }
  >({
    on: 'custom.move.column',
    guard: ({snapshot, event}) => {
      const originCell = getEnclosingBlock(snapshot, event.at, {match: isCell})
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
      const originTable = getParent(snapshot, originRow.path, {match: isTable})
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
      const originIndex = originRow.node.cells.findIndex(
        (cell) => cell._key === originCell.node._key,
      )
      const destinationIndex = destinationRow.node.cells.findIndex(
        (cell) => cell._key === destinationCell.node._key,
      )
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
        const actions = table.rows.flatMap((row) => {
          const originCell = row.cells.at(originIndex)
          const destinationCell = row.cells.at(destinationIndex)
          if (!originCell || !destinationCell) {
            return []
          }
          const rowPath: Path = [...tablePath, 'rows', {_key: row._key}]
          return [
            raise({
              type: 'move.block',
              at: [...rowPath, 'cells', {_key: originCell._key}],
              to: [...rowPath, 'cells', {_key: destinationCell._key}],
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
