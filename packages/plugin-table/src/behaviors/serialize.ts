import type {EditorSnapshot, Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {resolveTableSelection} from '../get-table-selection'
import type {Cell, Row, Table, TableSelection} from './types'

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
export const serializeBehaviors = [
  defineBehavior<Record<string, never>, 'serialize.data', SerializeDataResult>({
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
      const resolved = resolveTableSelection(snapshot)
      if (!resolved) {
        return false
      }
      const converter = snapshot.context.converters.find(
        (candidate) => candidate.mimeType === event.mimeType,
      )
      if (!converter) {
        return false
      }

      const rectangle = sliceTable(resolved.table.node, resolved.tableSelection)

      if (event.mimeType === 'text/plain') {
        // The plain-text converter flattens the linear fragment and comes up
        // empty for a doctored table snapshot, and a rectangle has a better
        // plain-text form anyway: the spreadsheet convention, cells joined by
        // tabs and rows by newlines, which pastes straight into Sheets and
        // Excel.
        return {
          type: 'serialization.success' as const,
          data: tableToTsv(rectangle),
          mimeType: 'text/plain' as const,
          originEvent: event.originEvent.type,
        }
      }

      const firstRow = rectangle.rows[0]
      const lastRow = rectangle.rows[rectangle.rows.length - 1]
      const firstCell = firstRow?.cells[0]
      const lastCell = lastRow?.cells[lastRow.cells.length - 1]
      if (!firstRow || !lastRow || !firstCell || !lastCell) {
        return false
      }

      const doctoredSnapshot = {
        ...snapshot,
        context: {...snapshot.context, value: [rectangle]},
      }
      const anchor = cellStartPoint(
        doctoredSnapshot,
        cellPath(rectangle, firstRow, firstCell),
      )
      const focus = cellEndPoint(
        doctoredSnapshot,
        cellPath(rectangle, lastRow, lastCell),
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

function sliceTable(table: Table, tableSelection: TableSelection): Table {
  const [rowStart, rowEnd] = tableSelection.rowRange
  const [colStart, colEnd] = tableSelection.colRange
  const sliced: Table = {
    ...table,
    rows: table.rows.slice(rowStart, rowEnd + 1).map((row) => ({
      ...row,
      cells: row.cells.slice(colStart, colEnd + 1),
    })),
  }
  if (typeof table.headerRows === 'number') {
    // Header rows only survive when the rectangle includes them.
    sliced.headerRows =
      rowStart === 0 ? Math.min(table.headerRows, sliced.rows.length) : 0
  }
  if (table.alignment) {
    // Alignment is positional per column.
    sliced.alignment = table.alignment.slice(colStart, colEnd + 1)
  }
  return sliced
}

function tableToTsv(table: Table): string {
  return table.rows
    .map((row) => row.cells.map((cell) => cellText(cell)).join('\t'))
    .join('\n')
}

function cellText(cell: Cell): string {
  return (
    cell.value
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

function cellPath(table: Table, row: Row, cell: Cell): Path {
  return [
    {_key: table._key},
    'rows',
    {_key: row._key},
    'cells',
    {_key: cell._key},
  ]
}
