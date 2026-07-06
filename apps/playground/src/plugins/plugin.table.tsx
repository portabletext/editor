import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {tableBehaviors} from '@portabletext/plugin-table'
import {TableCell, Table, TableRow} from '@portabletext/plugin-table/ui'
import type {JSX} from 'react'
import {ListItemBlock} from './list-item-block'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'

// The table/row/cell renders come from the plugin's reference UI; only the
// cell *content* renders (list items, images, callouts) are playground-owned.
const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: (props) => <Table {...props} />,
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: (props) => <TableRow {...props} />,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'value',
          render: (props) => <TableCell {...props} />,
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
