import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {isInline} from '../node-traversal/is-inline'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {RenderBlockObject} from './render.block-object'
import {RenderContainer} from './render.container'
import {RenderInlineObject} from './render.inline-object'
import {RenderTextBlock} from './render.text-block'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
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
  const slateStatic = useSlateStatic()
  const schema = props.schema

  const scopedTypeName = containerScope
    ? `${containerScope}.${props.element._type}`
    : props.element._type

  const containerConfig = useSelector(editorActor, (s) => {
    const configs = s.context.containerConfigs
    const exact = configs.get(scopedTypeName)
    if (exact) {
      return exact
    }
    const bareType = scopedTypeName.includes('.')
      ? scopedTypeName.split('.').pop()!
      : undefined
    return bareType ? configs.get(bareType) : undefined
  })

  if (containerConfig) {
    return (
      <RenderContainer
        attributes={props.attributes}
        element={props.element}
        containerConfig={containerConfig}
      >
        {props.children}
      </RenderContainer>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    return (
      <RenderTextBlock
        attributes={props.attributes}
        dropPosition={
          props.dropPosition?.blockKey === props.element._key
            ? props.dropPosition.positionBlock
            : undefined
        }
        element={props.element}
        path={props.path}
        readOnly={props.readOnly}
        renderBlock={props.renderBlock}
        renderListItem={props.renderListItem}
        renderStyle={props.renderStyle}
        schema={schema}
        spellCheck={props.spellCheck}
        textBlock={props.element}
      >
        {props.children}
      </RenderTextBlock>
    )
  }

  if (isInline(slateStatic, props.path)) {
    return (
      <RenderInlineObject
        attributes={props.attributes}
        element={props.element}
        path={props.path}
        readOnly={props.readOnly}
        renderChild={props.renderChild}
        schema={schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  return (
    <RenderBlockObject
      attributes={props.attributes}
      blockObject={props.element}
      dropPosition={
        props.dropPosition?.blockKey === props.element._key
          ? props.dropPosition.positionBlock
          : undefined
      }
      element={props.element}
      path={props.path}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      schema={schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}
