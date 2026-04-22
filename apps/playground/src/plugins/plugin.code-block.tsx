import {defineContainer, defineLeaf} from '@portabletext/editor'
import {ContainerPlugin, LeafPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const codeBlockContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre
      {...attributes}
      className="my-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-slate-700 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
    >
      {children}
    </pre>
  ),
})

const codeBlockSpanLeaf = defineLeaf<typeof playgroundSchemaDefinition>({
  scope: '$..code-block.block.span',
  render: ({attributes, children}) => (
    <span {...attributes} className="font-mono">
      {children}
    </span>
  ),
})

export function CodeBlockPlugin(): JSX.Element {
  return (
    <>
      <ContainerPlugin containers={[codeBlockContainer]} />
      <LeafPlugin leafs={[codeBlockSpanLeaf]} />
    </>
  )
}
