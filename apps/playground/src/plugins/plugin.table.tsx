import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {defineTable} from '@portabletext/plugin-table'
import {referenceContainers, TableCell} from '@portabletext/plugin-table/ui'
import {ListItemBlock} from './list-item-block'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'

// The table/row renders come straight from the plugin's reference UI; the
// cell definition is playground-owned so its `of` can carry the cell
// *content* renders (list items, images, callouts).
const table = defineTable({
  containers: {
    ...referenceContainers,
    cell: defineContainer({
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
  },
})

export const TablePlugin = table.Plugin
