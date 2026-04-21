import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const tableContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..table',
  field: 'rows',
  render: ({attributes, children}) => (
    <table
      {...attributes}
      className="my-3 w-full border-collapse overflow-hidden rounded-md border border-slate-300 dark:border-slate-700"
    >
      <tbody>{children}</tbody>
    </table>
  ),
})

const rowContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..table.row',
  field: 'cells',
  render: ({attributes, children}) => (
    <tr
      {...attributes}
      className="border-b border-slate-200 last:border-b-0 dark:border-slate-800"
    >
      {children}
    </tr>
  ),
})

const cellContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..table.row.cell',
  field: 'content',
  render: ({attributes, children}) => (
    <td
      {...attributes}
      className="border-r border-slate-200 px-3 py-2 align-top last:border-r-0 dark:border-slate-800"
    >
      {children}
    </td>
  ),
})

export function TablePlugin(): JSX.Element {
  return (
    <ContainerPlugin
      containers={[tableContainer, rowContainer, cellContainer]}
    />
  )
}
