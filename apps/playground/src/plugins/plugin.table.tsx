import {
  defineAnnotation,
  defineContainer,
  defineDecorator,
  defineTextBlock,
  type ContainerRenderProps,
} from '@portabletext/editor'
import {defineTable} from '@portabletext/plugin-table'
import {
  referenceContainers,
  Table,
  TableCell,
} from '@portabletext/plugin-table/ui'
import {useContext, type JSX} from 'react'
import {EditorFeatureFlagsContext} from '../feature-flags'
import {
  BlockDropIndicator,
  WithBlockDropIndicator,
} from './block-drop-indicator'
import {ListItemBlock} from './list-item-block'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'

// The row's render comes straight from the plugin's reference UI; the table
// render wraps the reference UI to add the drop indicator, and the cell
// definition is playground-owned so its `of` can carry the cell *content*
// renders (list items, images, callouts).
export const table = defineTable({
  containers: {
    ...referenceContainers,
    table: defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: (props) => <PlaygroundTable {...props} />,
    }),
    cell: defineContainer({
      type: 'cell',
      arrayField: 'value',
      render: (props) => <TableCell {...props} />,
      of: [
        defineTextBlock({
          type: 'block',
          render: ({attributes, children, node, path}) => (
            <WithBlockDropIndicator path={path}>
              {node.listItem !== undefined ? (
                <ListItemBlock attributes={attributes} node={node} path={path}>
                  {children}
                </ListItemBlock>
              ) : (
                <div {...attributes}>{children}</div>
              )}
            </WithBlockDropIndicator>
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

// The reference `Table` render positions its own chrome (handles, lanes,
// menu) relative to an inner scroll wrapper, not its outermost element, so
// the drop indicator gets its own `relative` wrapper around the whole thing
// instead of reaching into that inner layout.
function PlaygroundTable(props: ContainerRenderProps): JSX.Element {
  const flags = useContext(EditorFeatureFlagsContext)
  return (
    <div className="relative">
      <Table {...props} />
      {flags.dndPlugin ? <BlockDropIndicator path={props.path} /> : null}
    </div>
  )
}

export const TablePlugin = table.Plugin
