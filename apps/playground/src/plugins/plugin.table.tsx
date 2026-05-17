import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children, node, selected}) => (
    <table
      {...attributes}
      data-header-rows={
        typeof node.headerRows === 'number' ? node.headerRows : 0
      }
      data-selected={selected ? '' : undefined}
      className="playground-table"
    >
      <tbody>{children}</tbody>
    </table>
  ),
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, children, selected}) => (
        <tr {...attributes} data-selected={selected ? '' : undefined}>
          {children}
        </tr>
      ),
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'content',
          render: ({attributes, children, selected}) => (
            <td {...attributes} data-selected={selected ? '' : undefined}>
              {children}
            </td>
          ),
        }),
      ],
    }),
  ],
})

export function TablePlugin(): JSX.Element {
  return <NodePlugin nodes={[tableContainer]} />
}
