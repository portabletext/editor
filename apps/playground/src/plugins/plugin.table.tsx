import {
  defineAnnotation,
  defineContainer,
  defineDecorator,
  defineTextBlock,
} from '@portabletext/editor'
import {defineTable} from '@portabletext/plugin-table'
import {referenceContainers, TableCell} from '@portabletext/plugin-table/ui'
import {ListItemBlock} from './list-item-block'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'

// The table/row renders come straight from the plugin's reference UI; the
// cell definition is playground-owned so its `of` can carry the cell
// *content* renders (list items, images, callouts).
export const table = defineTable({
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
              <ListItemBlock attributes={attributes} node={node} path={path}>
                {children}
              </ListItemBlock>
            ) : (
              <div {...attributes}>{children}</div>
            ),
          // Positional override demo: inside table cells only, the
          // `strong` decorator renders with a highlight and the `link`
          // annotation as a green dotted underline, while the top-level
          // `'*'` decorator and annotation registrations (a plain
          // `<strong>` and a blue underline) still apply everywhere else.
          of: [
            defineDecorator({
              type: 'strong',
              render: ({children}) => (
                <strong className="bg-yellow-200 dark:bg-yellow-900/60 rounded px-0.5">
                  {children}
                </strong>
              ),
            }),
            defineAnnotation({
              type: 'link',
              render: ({children}) => (
                <span className="text-emerald-700 dark:text-emerald-400 underline decoration-dotted">
                  {children}
                </span>
              ),
            }),
          ],
        }),
        cellImageLeaf,
        calloutContainer,
      ],
    }),
  },
})

export const TablePlugin = table.Plugin
