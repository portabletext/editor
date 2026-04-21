import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const calloutContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children}) => (
    <aside
      {...attributes}
      className="my-3 rounded-md border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {children}
    </aside>
  ),
})

export function CalloutPlugin(): JSX.Element {
  return <ContainerPlugin containers={[calloutContainer]} />
}
