import {defineContainer, type ContainerRenderProps} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {useContext} from 'react'
import {EditorFeatureFlagsContext} from '../feature-flags'
import {BlockDropIndicator} from './block-drop-indicator'
import {DragHandle} from './drag-handle'

function CodeBlockContainer(props: ContainerRenderProps): JSX.Element {
  const {attributes, children, path, readOnly, selected} = props
  const flags = useContext(EditorFeatureFlagsContext)
  return (
    <pre
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="group relative my-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-slate-700 text-sm leading-relaxed transition-shadow data-[selected]:border-slate-400 data-[selected]:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:data-[selected]:border-slate-500"
    >
      <code className="block min-w-0 cursor-text">{children}</code>
      <DragHandle readOnly={readOnly} />
      {flags.dndPlugin ? <BlockDropIndicator path={path} /> : null}
    </pre>
  )
}

const codeBlockContainer = defineContainer({
  type: 'code-block',
  arrayField: 'lines',
  render: (props) => <CodeBlockContainer {...props} />,
})

export function CodeBlockPlugin(): JSX.Element {
  return <NodePlugin nodes={[codeBlockContainer]} />
}
