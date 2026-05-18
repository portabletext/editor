import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

/**
 * Tables. Three nested containers map to semantic <table>/<tr>/<td>
 * markup. Header rows render with <th> when `headerRows` is set on the
 * table block (markdown emits 1 for GFM tables with a `| --- |` rule).
 *
 * Cells light `data-selected` + `data-focused` so the CSS can give a
 * subtle ring on the active cell. Both attrs are omitted when false so
 * the inspector reads cleanly.
 */

const cellContainer = defineContainer({
  type: 'cell',
  arrayField: 'content',
  render: ({attributes, children, selected, focused}) => (
    <td
      {...attributes}
      className="pc-table-cell"
      data-selected={selected || undefined}
      data-focused={focused || undefined}
    >
      {children}
    </td>
  ),
})

const rowContainer = defineContainer({
  type: 'row',
  arrayField: 'cells',
  render: ({attributes, children}) => (
    <tr {...attributes} className="pc-table-row">
      {children}
    </tr>
  ),
  of: [cellContainer],
})

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children, node, selected, focused}) => {
    const block = node as {headerRows?: number}
    return (
      <table
        {...attributes}
        className="pc-table"
        data-header-rows={block.headerRows ?? 0}
        data-selected={selected || undefined}
        data-focused={focused || undefined}
      >
        <tbody>{children}</tbody>
      </table>
    )
  },
  of: [rowContainer],
})

export function TablesPlugin() {
  return <NodePlugin nodes={[tableContainer]} />
}
