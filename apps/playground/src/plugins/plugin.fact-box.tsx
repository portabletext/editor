import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {LayersIcon} from 'lucide-react'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const factBoxContainer = defineContainer<typeof playgroundSchemaDefinition>({
  type: 'fact-box',
  childField: 'content',
  render: ({attributes, children, selected}) => (
    <section
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="my-4 rounded-lg border border-stone-300 bg-stone-50 px-5 py-4 shadow-sm transition-shadow data-[selected]:border-stone-500 data-[selected]:shadow-lg dark:border-stone-600 dark:bg-stone-800/40 dark:data-[selected]:border-stone-400"
    >
      <div
        contentEditable={false}
        className="-mx-5 -mt-4 mb-3 flex items-center gap-2 rounded-t-lg border-stone-300 border-b bg-stone-100 px-5 py-2 font-mono text-stone-600 text-xs uppercase tracking-wider dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-300"
      >
        <LayersIcon aria-hidden className="h-3.5 w-3.5" />
        <span>Fact box</span>
      </div>
      <div className="text-stone-800 dark:text-stone-100">{children}</div>
    </section>
  ),
  renderChild: {
    block: ({attributes, children, node}) => {
      const block = node as {style?: string; listItem?: string}
      if (block.listItem !== undefined) {
        return (
          <div {...attributes} className="my-1">
            {children}
          </div>
        )
      }
      switch (block.style) {
        case 'h1':
          return (
            <h1 {...attributes} className="my-2 font-bold text-2xl">
              {children}
            </h1>
          )
        case 'h2':
          return (
            <h2 {...attributes} className="my-2 font-bold text-xl">
              {children}
            </h2>
          )
        case 'h3':
          return (
            <h3 {...attributes} className="my-2 font-bold text-lg">
              {children}
            </h3>
          )
        case 'h4':
          return (
            <h4 {...attributes} className="my-2 font-bold">
              {children}
            </h4>
          )
        case 'h5':
          return (
            <h5 {...attributes} className="my-2 font-semibold">
              {children}
            </h5>
          )
        case 'h6':
          return (
            <h6 {...attributes} className="my-2 font-semibold">
              {children}
            </h6>
          )
        case 'blockquote':
          return (
            <blockquote
              {...attributes}
              className="my-1 border-l-2 border-stone-500 pl-2 italic dark:border-stone-300"
            >
              {children}
            </blockquote>
          )
        default:
          return (
            <p {...attributes} className="my-1">
              {children}
            </p>
          )
      }
    },
  },
})

export function FactBoxPlugin(): JSX.Element {
  return <ContainerPlugin containers={[factBoxContainer]} />
}
