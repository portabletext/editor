import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {DragHandle} from './drag-handle'

const factBoxContainer = defineContainer({
  type: 'fact-box',
  arrayField: 'content',
  render: ({attributes, children, readOnly, selected}) => (
    <section
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="group relative my-4 rounded-lg border border-stone-300 bg-stone-50 p-4 shadow-sm transition-shadow data-[selected]:border-stone-500 data-[selected]:shadow-lg dark:border-stone-600 dark:bg-stone-800/40 dark:data-[selected]:border-stone-400"
    >
      <div className="cursor-text text-stone-800 dark:text-stone-100">
        {children}
      </div>
      <DragHandle readOnly={readOnly} />
    </section>
  ),
  of: [
    defineTextBlock({
      type: 'block',
      render: ({attributes, children, node}) => {
        if (node.listItem !== undefined) {
          return (
            <div {...attributes} className="my-1">
              {children}
            </div>
          )
        }

        switch (node.style) {
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
    }),
  ],
})

export function FactBoxPlugin(): JSX.Element {
  return <NodePlugin nodes={[factBoxContainer]} />
}
