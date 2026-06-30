import {defineContainer} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {insertBehaviors} from './behaviors/insert'
import {moveBehaviors} from './behaviors/move'
import {unsetBehaviors} from './behaviors/unset'

// `table` -> `row` -> `cell` nested containers. The render is intentionally
// trivial: the behaviors only need the container structure registered to
// operate on the nested arrays.
const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children}) => (
    <table {...attributes}>
      <tbody>{children}</tbody>
    </table>
  ),
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'value',
          render: ({attributes, children}) => (
            <td {...attributes}>{children}</td>
          ),
        }),
      ],
    }),
  ],
})

/**
 * Registers the table containers and the row/column insert, unset, and
 * move behaviors. Drive them by dispatching `custom.insert.row`,
 * `custom.insert.column`, `custom.unset.row`, `custom.unset.column`,
 * `custom.unset.table`, `custom.move.row`, or `custom.move.column`.
 *
 * @alpha
 */
export function TablePlugin() {
  return (
    <>
      <NodePlugin nodes={[tableContainer]} />
      <BehaviorPlugin
        behaviors={[...insertBehaviors, ...unsetBehaviors, ...moveBehaviors]}
      />
    </>
  )
}
