import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const codeBlockContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre
      {...attributes}
      className="my-2 rounded bg-slate-900 p-3 font-mono text-sm text-slate-100"
    >
      {children}
    </pre>
  ),
})

export function CodeBlockPlugin(): JSX.Element {
  return <ContainerPlugin containers={[codeBlockContainer]} />
}
