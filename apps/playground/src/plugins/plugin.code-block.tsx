import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {DragHandle} from './drag-handle'

const codeBlockContainer = defineContainer({
  type: 'code-block',
  arrayField: 'lines',
  render: ({attributes, children, readOnly, selected}) => (
    <pre
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="group relative my-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-slate-700 text-sm leading-relaxed transition-shadow data-[selected]:border-slate-400 data-[selected]:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:data-[selected]:border-slate-500"
    >
      <code className="block min-w-0 cursor-text">{children}</code>
      <DragHandle readOnly={readOnly} />
    </pre>
  ),
})

export function CodeBlockPlugin(): JSX.Element {
  return <NodePlugin nodes={[codeBlockContainer]} />
}
