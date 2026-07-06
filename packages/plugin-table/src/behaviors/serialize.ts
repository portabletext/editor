import type {EditorSnapshot, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {resolveTableSelection} from '../get-table-selection'
import {cellValue, rowCells, tableRows, type TableConfig} from '../table-config'
import type {CellNode, RowNode, TableNode, TableSelection} from './types'

type SerializeDataResult = ReturnType<
  EditorSnapshot['context']['converters'][number]['serialize']
>

/**
 * Copying or cutting a rectangular cell selection must serialize the
 * rectangle, not the linear fragment between its corners, which covers
 * cells outside a column selection by construction. The interception calls
 * the same converter core would call, but against a snapshot whose value is
 * a synthetic table sliced to the rectangle and whose selection spans it
 * leaf-to-leaf, the same snapshot-override idiom core's own `serialize.data`
 * behavior uses for drag origins. The rectangle clear on cut comes from the
 * `delete` that `clipboard.cut` raises after `serialize`.
 */
export function createSerializeBehaviors(config: TableConfig) {
  return [
    defineBehavior<
      Record<string, never>,
      'serialize.data',
      SerializeDataResult
    >({
      on: 'serialize.data',
      guard: ({snapshot, event}) => {
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
        const converter = snapshot.context.converters.find(
          (candidate) => candidate.mimeType === event.mimeType,
        )
        if (!converter) {
          return false
        }

        const rectangle = sliceTable(
          config,
          resolved.table.node,
          resolved.tableSelection,
        )

        if (event.mimeType === 'text/plain') {
          // The plain-text converter flattens the linear fragment and comes up
          // empty for a doctored table snapshot, and a rectangle has a better
          // plain-text form anyway: the spreadsheet convention, cells joined by
          // tabs and rows by newlines, which pastes straight into Sheets and
          // Excel.
          return {
            type: 'serialization.success' as const,
            data: tableToTsv(config, rectangle),
            mimeType: 'text/plain' as const,
            originEvent: event.originEvent.type,
          }
        }

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

        return converter.serialize({
          snapshot: {
            ...doctoredSnapshot,
            context: {
              ...doctoredSnapshot.context,
              selection: {anchor, focus},
            },
          },
          event: {type: 'serialize', originEvent: event.originEvent.type},
        })
      },
      actions: [
        ({event}, serialization) => [
          raise({...serialization, originEvent: event.originEvent}),
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
  if (table.alignment) {
    // Alignment is positional per column.
    sliced.alignment = table.alignment.slice(colStart, colEnd + 1)
  }
  return sliced
}

function tableToTsv(config: TableConfig, table: TableNode): string {
  return tableRows(config, table)
    .map((row) =>
      rowCells(config, row)
        .map((cell) => cellText(config, cell))
        .join('\t'),
    )
    .join('\n')
}

function cellText(config: TableConfig, cell: CellNode): string {
  return (
    cellValue(config, cell)
      .map((block) =>
        'children' in block && Array.isArray(block.children)
          ? block.children
              .map((child) =>
                typeof child.text === 'string' ? child.text : '',
              )
              .join('')
          : '',
      )
      .join(' ')
      // Tabs and newlines inside cell text would corrupt the TSV shape;
      // flatten them to spaces. Quote-escaping can come if spreadsheet
      // round-trips demand it.
      .replace(/[\t\n]/g, ' ')
  )
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
