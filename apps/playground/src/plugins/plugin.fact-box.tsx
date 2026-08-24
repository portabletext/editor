import {
  defineContainer,
  defineTextBlock,
  type TextBlockRenderProps,
  type ContainerRenderProps,
} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {useContext} from 'react'
import {EditorFeatureFlagsContext} from '../feature-flags'
import {
  BlockDropIndicator,
  WithBlockDropIndicator,
} from './block-drop-indicator'
import {DragHandle} from './drag-handle'
import {ListItemBlock} from './list-item-block'

function FactBoxContainer(props: ContainerRenderProps): JSX.Element {
  const {attributes, children, path, readOnly, selected} = props
  const flags = useContext(EditorFeatureFlagsContext)
  return (
    <section
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="group relative my-4 rounded-lg border border-stone-300 bg-stone-50 p-4 shadow-sm transition-shadow data-[selected]:border-stone-500 data-[selected]:shadow-lg dark:border-stone-600 dark:bg-stone-800/40 dark:data-[selected]:border-stone-400"
    >
      <div className="cursor-text text-stone-800 dark:text-stone-100">
        {children}
      </div>
      <DragHandle readOnly={readOnly} />
      {flags.dndPlugin ? <BlockDropIndicator path={path} /> : null}
    </section>
  )
}

const factBoxContainer = defineContainer({
  type: 'fact-box',
  arrayField: 'content',
  render: (props) => <FactBoxContainer {...props} />,
  of: [
    defineTextBlock({
      type: 'block',
      render: (props) => (
        <WithBlockDropIndicator path={props.path}>
          {renderFactBoxTextBlock(props)}
        </WithBlockDropIndicator>
      ),
    }),
  ],
})

export function FactBoxPlugin(): JSX.Element {
  return <NodePlugin nodes={[factBoxContainer]} />
}

function renderFactBoxTextBlock({
  attributes,
  children,
  node,
  path,
}: TextBlockRenderProps): JSX.Element {
  if (node.listItem !== undefined) {
    return (
      <ListItemBlock attributes={attributes} node={node} path={path}>
        {children}
      </ListItemBlock>
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
}
