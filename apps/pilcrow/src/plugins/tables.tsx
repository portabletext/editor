import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'

const cellContainer = defineContainer({
  type: 'cell',
  childField: 'content',
  render: ({attributes, children}) => (
    <div {...attributes} className="pc-table-cell">
      {children}
    </div>
  ),
})

const rowContainer = defineContainer({
  type: 'row',
  childField: 'cells',
  render: ({attributes, children}) => {
    return (
      <div {...attributes} className="pc-table-row">
        {children}
      </div>
    )
  },
  of: [cellContainer],
})

const tableContainer = defineContainer({
  type: 'table',
  childField: 'rows',
  render: ({attributes, children, node}) => {
    const block = node as {headerRows?: number}
    return (
      <div
        {...attributes}
        className="pc-table"
        data-header-rows={block.headerRows ?? 0}
      >
        {children}
      </div>
    )
  },
  of: [rowContainer],
})

export function TablesPlugin() {
  return <ContainerPlugin containers={[tableContainer]} />
}
