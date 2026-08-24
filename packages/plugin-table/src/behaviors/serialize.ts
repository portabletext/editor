import type {Path} from '@portabletext/editor'
import {defineBehavior, forward} from '@portabletext/editor/behaviors'
import {getFragment} from '@portabletext/editor/selectors'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {resolveTableSelection} from '../get-table-selection'
import {rowCells, tableRows, type TableConfig} from '../table-config'
import type {CellNode, RowNode, TableNode, TableSelection} from './types'

/**
 * Copying or cutting a rectangular cell selection must serialize the
 * rectangle, not the linear fragment between its corners, which covers
 * cells outside a column selection by construction. The interception
 * builds a synthetic table sliced to the rectangle and `forward`s the
 * mime-type event with that rectangle attached as `event.blocks`, the same
 * snapshot-override idiom core's own `serialize.data` Behavior uses for
 * drag origins; core's converters and any consumer `serialize.data`
 * Behavior downstream then serialize the rectangle instead of deriving a
 * fragment from the raw selection. The `event.blocks === undefined` guard
 * stops the rectangle from being re-resolved once it is already attached.
 * The rectangle clear on cut comes from the `delete` that `clipboard.cut`
 * raises after `serialize`.
 */
export function createSerializeBehaviors(config: TableConfig) {
  return [
    defineBehavior({
      on: 'serialize.data',
      guard: ({snapshot, event}) => {
        if (event.blocks !== undefined) {
          return false
        }
        if (
          event.originEvent.type !== 'clipboard.copy' &&
          event.originEvent.type !== 'clipboard.cut'
        ) {
          // Drag origins carry a grabbed selection that differs from the
          // editor selection the rectangle is derived from.
          return false
        }
        const resolved = resolveTableSelection(snapshot, config)
        if (!resolved) {
          return false
        }

        const rectangle = sliceTable(
          config,
          resolved.table.node,
          resolved.tableSelection,
        )

        const rectangleRows = tableRows(config, rectangle)
        const firstRow = rectangleRows[0]
        const lastRow = rectangleRows[rectangleRows.length - 1]
        const firstCell = firstRow ? rowCells(config, firstRow)[0] : undefined
        const lastCells = lastRow ? rowCells(config, lastRow) : []
        const lastCell = lastCells[lastCells.length - 1]
        if (!firstRow || !lastRow || !firstCell || !lastCell) {
          return false
        }

        const doctoredSnapshot = {
          ...snapshot,
          context: {...snapshot.context, value: [rectangle]},
        }
        const anchor = cellStartPoint(
          doctoredSnapshot,
          cellPath(config, rectangle, firstRow, firstCell),
        )
        const focus = cellEndPoint(
          doctoredSnapshot,
          cellPath(config, rectangle, lastRow, lastCell),
        )
        if (!anchor || !focus) {
          return false
        }

        const rectangleSnapshot = {
          ...doctoredSnapshot,
          context: {
            ...doctoredSnapshot.context,
            selection: {anchor, focus},
          },
        }

        return getFragment(rectangleSnapshot).map((entry) => entry.node)
      },
      actions: [
        ({event}, rectangleBlocks) => [
          forward({...event, blocks: rectangleBlocks}),
        ],
      ],
    }),
  ]
}

function sliceTable(
  config: TableConfig,
  table: TableNode,
  tableSelection: TableSelection,
): TableNode {
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  const slicedRows = tableRows(config, table)
    .slice(rowStart, rowEnd + 1)
    .map((row) => ({
      ...row,
      [config.cellsField]: rowCells(config, row).slice(colStart, colEnd + 1),
    }))
  const sliced: TableNode = {
    ...table,
    [config.rowsField]: slicedRows,
  }
  if (typeof table.headerRows === 'number') {
    // Header rows only survive when the rectangle includes them.
    sliced.headerRows =
      rowStart === 0 ? Math.min(table.headerRows, slicedRows.length) : 0
  }
  return sliced
}

function cellPath(
  config: TableConfig,
  table: TableNode,
  row: RowNode,
  cell: CellNode,
): Path {
  return [
    {_key: table._key},
    config.rowsField,
    {_key: row._key},
    config.cellsField,
    {_key: cell._key},
  ]
}
