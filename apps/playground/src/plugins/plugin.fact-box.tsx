import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {BlockDropIndicator} from './block-drop-indicator'
import {ContainerTextBlock} from './container-text-block'
import {DragHandle} from './drag-handle'

const factBoxTextStyles = {
  normal: {tag: 'p', className: 'my-1'},
  h1: {tag: 'h1', className: 'my-2 font-bold text-2xl'},
  h2: {tag: 'h2', className: 'my-2 font-bold text-xl'},
  h3: {tag: 'h3', className: 'my-2 font-bold text-lg'},
  h4: {tag: 'h4', className: 'my-2 font-bold'},
  h5: {tag: 'h5', className: 'my-2 font-semibold'},
  h6: {tag: 'h6', className: 'my-2 font-semibold'},
  blockquote: {
    tag: 'blockquote',
    className:
      'my-1 border-l-2 border-stone-500 pl-2 italic dark:border-stone-300',
  },
} as const

const factBoxContainer = defineContainer({
  type: 'fact-box',
  arrayField: 'content',
  render: ({attributes, children, path, readOnly, selected}) => (
    <section
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="group relative my-4 rounded-lg border border-stone-300 bg-stone-50 p-4 shadow-sm transition-shadow data-[selected]:border-stone-500 data-[selected]:shadow-lg dark:border-stone-600 dark:bg-stone-800/40 dark:data-[selected]:border-stone-400"
    >
      <div className="cursor-text text-stone-800 dark:text-stone-100">
        {children}
      </div>
      <DragHandle readOnly={readOnly} />
      <BlockDropIndicator path={path} />
    </section>
  ),
  of: [
    defineTextBlock({
      type: 'block',
      render: ({attributes, children, node, path}) => (
        <ContainerTextBlock
          attributes={attributes}
          node={node}
          path={path}
          styles={factBoxTextStyles}
          children={children}
        />
      ),
    }),
  ],
})

export function FactBoxPlugin(): JSX.Element {
  return <NodePlugin nodes={[factBoxContainer]} />
}
