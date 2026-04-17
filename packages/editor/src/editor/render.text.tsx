import {useContext} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {LeafConfig} from '../renderers/renderer.types'
import type {Editable} from '../slate/react/components/editable'
import {useContainerScope} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import {buildScopedName, findByScope} from './scoped-config-lookup'
import {SelectionStateContext} from './selection-state-context'

export type RenderTextProps = Parameters<
  NonNullable<React.ComponentProps<typeof Editable>['renderText']>
>[0]

export function RenderText(props: RenderTextProps) {
  const containerScope = useContainerScope()
  const editorActor = useContext(EditorActorContext)
  const schema = editorActor.getSnapshot().context.schema
  const leafScope = buildScopedName(containerScope, `block.${schema.span.name}`)
  const leafConfig = findByScope(
    editorActor.getSnapshot().context.leafConfigs,
    leafScope,
  )

  const attributes = {
    ...props.attributes,
    'data-child-key': props.text._key,
    'data-child-name': props.text._type,
    'data-child-type': 'span',
  }

  if (leafConfig) {
    return (
      <RenderLeafConfig
        leafConfig={leafConfig}
        attributes={attributes}
        path={props.path}
        text={props.text}
      >
        {props.children}
      </RenderLeafConfig>
    )
  }

  return <span {...attributes}>{props.children}</span>
}

function RenderLeafConfig(props: {
  leafConfig: LeafConfig
  attributes: Record<string, unknown>
  children: React.ReactNode
  path: RenderTextProps['path']
  text: RenderTextProps['text']
}) {
  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const focused = selectionState.focusedLeafPath === serializedPath
  const selected = selectionState.selectedLeafPaths.has(serializedPath)

  const rendered = props.leafConfig.leaf.render({
    attributes: props.attributes,
    children: props.children as React.ReactElement,
    focused,
    node: props.text,
    path: props.path,
    selected,
  })
  if (rendered === null) {
    return <span {...props.attributes}>{props.children}</span>
  }
  return rendered
}
