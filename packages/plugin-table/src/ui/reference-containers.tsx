import {defineContainer} from '@portabletext/editor'
import type {TableContainers} from '../define-table'
import {Table, TableCell, TableRow} from './table-render'

/**
 * The pre-wired container definitions: canonical type names and array
 * fields with the reference renders. Pass to `defineTable` for the
 * reference UI:
 *
 * ```tsx
 * import {defineTable} from '@portabletext/plugin-table'
 * import {referenceContainers} from '@portabletext/plugin-table/ui'
 *
 * export const table = defineTable({containers: referenceContainers})
 * ```
 *
 * @alpha
 */
export const referenceContainers: TableContainers = {
  table: defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: (props) => <Table {...props} />,
  }),
  row: defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: (props) => <TableRow {...props} />,
  }),
  cell: defineContainer({
    type: 'cell',
    arrayField: 'value',
    render: (props) => <TableCell {...props} />,
  }),
}
