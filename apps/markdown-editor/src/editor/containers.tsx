import {defineContainer} from '@portabletext/editor'
import type {schemaDefinition} from './schema'

const calloutToneClassName: Record<string, string> = {
  note: 'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  tip: 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  important:
    'border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100',
  warning:
    'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  caution:
    'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
}

export const tableContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..table',
  field: 'rows',
  render: ({attributes, children, node}) => {
    const headerRows = (node as {headerRows?: number}).headerRows ?? 0
    return (
      <table
        {...attributes}
        data-header-rows={headerRows}
        className="my-3 border-collapse text-sm"
      >
        <tbody>{children}</tbody>
      </table>
    )
  },
})

export const rowContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..table.row',
  field: 'cells',
  render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
})

export const cellContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..table.row.cell',
  field: 'value',
  render: ({attributes, children}) => (
    <td
      {...attributes}
      className="border border-gray-200 dark:border-gray-700 px-2 py-1 align-top"
    >
      {children}
    </td>
  ),
})

export const calloutContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children, node}) => {
    const tone = (node as {tone?: string}).tone ?? 'note'
    const toneClass = calloutToneClassName[tone] ?? calloutToneClassName.note!
    return (
      <aside
        {...attributes}
        data-tone={tone}
        className={`my-3 rounded-md border-l-4 px-4 py-3 ${toneClass}`}
      >
        {children}
      </aside>
    )
  },
})

export const calloutBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout.block',
  field: 'children',
  render: ({attributes, children}) => (
    <p {...attributes} className="my-1">
      {children}
    </p>
  ),
})

export const blockquoteContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..blockquote',
  field: 'content',
  render: ({attributes, children}) => (
    <blockquote
      {...attributes}
      className="my-2 border-gray-300 border-l-4 pl-3 text-gray-600 italic dark:border-gray-600 dark:text-gray-400"
    >
      {children}
    </blockquote>
  ),
})

export const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre
      {...attributes}
      className="my-3 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-gray-700 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
    >
      {children}
    </pre>
  ),
})

export const listContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..list',
  field: 'items',
  render: ({attributes, children, node}) => {
    const kind = (node as {kind?: string}).kind ?? 'bullet'
    if (kind === 'number') {
      return (
        <ol {...attributes} className="my-2 list-decimal space-y-1 pl-6">
          {children}
        </ol>
      )
    }
    return (
      <ul
        {...attributes}
        data-kind={kind}
        className={
          kind === 'task'
            ? 'my-2 list-none space-y-1 pl-2'
            : 'my-2 list-disc space-y-1 pl-6'
        }
      >
        {children}
      </ul>
    )
  },
})

export const listItemContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..list.list-item',
  field: 'content',
  render: ({attributes, children, node}) => {
    const checked = (node as {checked?: boolean}).checked
    if (typeof checked === 'boolean') {
      return (
        <li {...attributes} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1.5 flex-none"
          />
          <div
            className={checked ? 'flex-1 line-through opacity-60' : 'flex-1'}
          >
            {children}
          </div>
        </li>
      )
    }
    return <li {...attributes}>{children}</li>
  },
})

export const allContainers = [
  tableContainer,
  rowContainer,
  cellContainer,
  calloutContainer,
  calloutBlockContainer,
  blockquoteContainer,
  codeBlockContainer,
  listContainer,
  listItemContainer,
]
