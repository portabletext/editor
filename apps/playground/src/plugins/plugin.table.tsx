import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const tableContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..table',
  field: 'rows',
  render: ({attributes, children, node}) => (
    <table
      {...attributes}
      data-header-rows={node.headerRows ?? 0}
      className="playground-table"
    >
      <tbody>{children}</tbody>
    </table>
  ),
})

const rowContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..table.row',
  field: 'cells',
  render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
})

const cellContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..table.row.cell',
  field: 'content',
  render: ({attributes, children}) => <td {...attributes}>{children}</td>,
})

export function TablePlugin(): JSX.Element {
  return (
    <ContainerPlugin
      containers={[tableContainer, rowContainer, cellContainer]}
    />
  )
}
