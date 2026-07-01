import {
  defineContainer,
  defineTextBlock,
  type ContainerRenderProps,
} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {isTable, tableBehaviors} from '@portabletext/plugin-table'
import type {JSX} from 'react'
import {DragHandle} from './drag-handle'
import {ListItemBlock} from './list-item-block'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: (props) => <TableContainer {...props} />,
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
          arrayField: 'value',
          render: ({attributes, children, selected}) => (
            <td {...attributes} data-selected={selected ? '' : undefined}>
              {children}
            </td>
          ),
          of: [
            defineTextBlock({
              type: 'block',
              render: ({attributes, children, node, path}) =>
                node.listItem !== undefined ? (
                  <ListItemBlock
                    attributes={attributes}
                    node={node}
                    path={path}
                    children={children}
                  />
                ) : (
                  <div {...attributes}>{children}</div>
                ),
            }),
            cellImageLeaf,
            calloutContainer,
          ],
        }),
      ],
    }),
  ],
})

export function TablePlugin(): JSX.Element {
  return (
    <>
      <NodePlugin nodes={[tableContainer]} />
      <BehaviorPlugin behaviors={tableBehaviors} />
    </>
  )
}

function TableContainer({
  attributes,
  children,
  node,
  readOnly,
  selected,
}: ContainerRenderProps): JSX.Element {
  const table = isTable(node) ? node : undefined
  const headerRows = Number(table?.headerRows) || 0
  const columnCount = table?.rows[0]?.cells.length ?? 0
  return (
    <div
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="playground-table-chrome group"
    >
      <table
        className="playground-table cursor-text"
        data-header-rows={headerRows}
      >
        <colgroup>
          {Array.from({length: columnCount}, (_, index) => (
            <col key={index} />
          ))}
        </colgroup>
        <tbody>{children}</tbody>
      </table>
      <DragHandle readOnly={readOnly} />
    </div>
  )
}
