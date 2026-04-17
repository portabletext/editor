import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactNode} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {RenderContainer} from './render.container'
import {RenderContainerChild} from './render.container-child'
import {buildScopedName, lookupScopedConfig} from './scoped-config-lookup'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactNode
  dropPosition?: DropPosition
  element: PortableTextTextBlock | PortableTextObject
  path: Path
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  schema: EditorSchema
  spellCheck?: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const containerScope = useContext(ContainerScopeContext)
  const schema = props.schema

  const scopedTypeName = buildScopedName(containerScope, props.element._type)

  const containerConfig = useSelector(editorActor, (s) =>
    lookupScopedConfig(s.context.containerConfigs, scopedTypeName),
  )

  if (containerConfig) {
    return (
      <RenderContainer
        attributes={props.attributes}
        element={props.element}
        containerConfig={containerConfig}
        path={props.path}
      >
        {props.children}
      </RenderContainer>
    )
  }

  if (containerScope) {
    return (
      <RenderContainerChild
        attributes={props.attributes}
        element={props.element}
        path={props.path}
      >
        {props.children}
      </RenderContainerChild>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    return (
      <RenderContainer
        attributes={props.attributes}
        element={props.element}
        legacyCallbacks={{
          dropPosition:
            props.dropPosition?.blockKey === props.element._key
              ? props.dropPosition.positionBlock
              : undefined,
          renderBlock: props.renderBlock,
          renderListItem: props.renderListItem,
          renderStyle: props.renderStyle,
          schema,
          spellCheck: props.spellCheck,
        }}
        path={props.path}
      >
        {props.children}
      </RenderContainer>
    )
  }

  return (
    <RenderContainerChild
      attributes={props.attributes}
      element={props.element}
      legacyCallbacks={{
        dropPosition:
          props.dropPosition?.blockKey === props.element._key
            ? props.dropPosition.positionBlock
            : undefined,
        readOnly: props.readOnly,
        renderBlock: props.renderBlock,
        renderChild: props.renderChild,
      }}
      path={props.path}
    >
      {props.children}
    </RenderContainerChild>
  )
}
