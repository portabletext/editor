import {defineContainer, defineLeaf} from '@portabletext/editor'
import {ContainerPlugin, LeafPlugin} from '@portabletext/editor/plugins'
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

const calloutImageLeaf = defineLeaf<typeof playgroundSchemaDefinition>({
  scope: '$..callout.image',
  render: ({attributes, children, node, focused, selected}) => {
    const image = node as {src?: string; alt?: string}
    return (
      <span
        {...attributes}
        className={[
          'my-1 inline-flex items-center justify-center overflow-hidden rounded border border-amber-300 dark:border-amber-700',
          selected
            ? 'outline outline-2 outline-amber-500 dark:outline-amber-400'
            : '',
          focused ? 'bg-amber-100 dark:bg-amber-900/40' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <img
          src={image.src}
          alt={image.alt ?? ''}
          contentEditable={false}
          className="h-16 w-auto object-contain"
        />
        {children}
      </span>
    )
  },
})

export function CalloutPlugin(): JSX.Element {
  return (
    <>
      <ContainerPlugin containers={[calloutContainer]} />
      <LeafPlugin leafs={[calloutImageLeaf]} />
    </>
  )
}
