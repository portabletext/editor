import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const tableContainer = defineContainer<typeof playgroundSchemaDefinition>({
  type: 'table',
  childField: 'rows',
  render: ({attributes, children, node, selected}) => (
    <table
      {...attributes}
      data-header-rows={(node as {headerRows?: number}).headerRows ?? 0}
      data-selected={selected ? '' : undefined}
      className="playground-table"
    >
      <tbody>{children}</tbody>
    </table>
  ),
})

const rowContainer = defineContainer<typeof playgroundSchemaDefinition>({
  type: 'row',
  childField: 'cells',
  render: ({attributes, children, selected}) => (
    <tr {...attributes} data-selected={selected ? '' : undefined}>
      {children}
    </tr>
  ),
})

const cellContainer = defineContainer<typeof playgroundSchemaDefinition>({
  type: 'cell',
  childField: 'content',
  render: ({attributes, children, selected}) => (
    <td {...attributes} data-selected={selected ? '' : undefined}>
      {children}
    </td>
  ),
  renderChild: {
    image: ({attributes, children, node, focused, readOnly, selected}) => {
      const image = node as {src?: string; alt?: string}
      return (
        <div {...attributes}>
          {children}
          <div
            contentEditable={false}
            draggable={!readOnly}
            className={[
              'grid grid-cols-[auto_1fr] my-0.5 items-center gap-1 border border-gray-300 dark:border-gray-600 rounded text-xs',
              selected ? 'border-blue-300 dark:border-blue-600' : '',
              focused ? 'bg-blue-50 dark:bg-blue-900/30' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="bg-gray-100 dark:bg-gray-700 size-8 overflow-clip flex items-center justify-center">
              <img
                className="object-scale-down max-w-full"
                src={image.src}
                alt={image.alt ?? ''}
              />
            </div>
            <span className="text-ellipsis overflow-hidden whitespace-nowrap px-1">
              {image.alt || image.src}
            </span>
          </div>
        </div>
      )
    },
  },
})

export function TablePlugin(): JSX.Element {
  return (
    <ContainerPlugin
      containers={[tableContainer, rowContainer, cellContainer]}
    />
  )
}
