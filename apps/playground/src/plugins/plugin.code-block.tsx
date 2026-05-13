import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const codeBlockContainer = defineContainer<typeof playgroundSchemaDefinition>({
  type: 'code-block',
  childField: 'lines',
  render: ({attributes, children, selected}) => (
    <pre
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="my-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-slate-700 text-sm leading-relaxed transition-shadow data-[selected]:border-slate-400 data-[selected]:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:data-[selected]:border-slate-500"
    >
      {children}
    </pre>
  ),
})

// The legacy `$..code-block.block.span` leaf override was deleted: the
// outer <pre> has `font-mono` so spans inside inherit the monospace
// face via CSS. Override was redundant.

export function CodeBlockPlugin(): JSX.Element {
  return <ContainerPlugin containers={[codeBlockContainer]} />
}
