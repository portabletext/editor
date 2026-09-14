import {defineContainer} from '@portabletext/editor'
import {defineTable} from '@portabletext/plugin-table'
import {Table, TableCell, TableRow} from '@portabletext/plugin-table/ui'

/**
 * The `legacy` markdown-loop preset's table, migrated from a foreign CMS
 * that never used the plugin's canonical type names: same three-level
 * shape and the same `rows`/`cells`/`value` array fields, but `table` /
 * `row` / `cell` renamed to `richTable` / `richTableRow` / `richTableCell`.
 * Mirrors `plugin.table.tsx`'s module-scope `defineTable` call.
 */
const legacyTable = defineTable({
  containers: {
    table: defineContainer({
      type: 'richTable',
      arrayField: 'rows',
      render: (props) => <Table {...props} />,
    }),
    row: defineContainer({
      type: 'richTableRow',
      arrayField: 'cells',
      render: (props) => <TableRow {...props} />,
    }),
    cell: defineContainer({
      type: 'richTableCell',
      arrayField: 'value',
      render: (props) => <TableCell {...props} />,
    }),
  },
})

export const LegacyTablePlugin = legacyTable.Plugin
