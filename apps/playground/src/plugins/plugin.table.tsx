import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {cellImageLeaf} from './plugin.image'

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children, node, readOnly, selected}) => (
    <div
      {...attributes}
      draggable={!readOnly}
      data-header-rows={
        typeof node.headerRows === 'number' ? node.headerRows : 0
      }
      data-selected={selected ? '' : undefined}
      className="playground-table-chrome"
    >
      <table draggable={false} className="playground-table cursor-text">
        <tbody>{children}</tbody>
      </table>
    </div>
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
          of: [cellImageLeaf],
        }),
      ],
    }),
  ],
})

export function TablePlugin(): JSX.Element {
  return <NodePlugin nodes={[tableContainer]} />
}
