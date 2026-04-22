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
      style={{
        borderCollapse: 'collapse',
        width: '100%',
        margin: '1rem 0',
        fontSize: '0.875rem',
      }}
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
  render: ({attributes, children}) => (
    <td
      {...attributes}
      style={{
        border: '1px solid #94a3b8',
        padding: '0.5rem 0.75rem',
        verticalAlign: 'top',
        minWidth: '8rem',
      }}
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
