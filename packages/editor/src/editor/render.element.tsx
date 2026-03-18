import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {isContainerType} from '../renderers/container-schema'
import {useRenderer} from '../renderers/use-renderer'
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
import {RenderBlockObject} from './render.block-object'
import {RenderInlineObject} from './render.inline-object'
import {RenderTextBlock} from './render.text-block'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition
  element: PortableTextTextBlock | PortableTextObject
  indexedPath: RenderElementProps['indexedPath']
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  spellCheck?: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const schema = useSelector(editorActor, (s) => s.context.schema)
  const slateStatic = useSlateStatic()

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

  if (slateStatic.isInline(props.element)) {
    return (
      <RenderInlineObject
        attributes={props.attributes}
        element={props.element}
        indexedPath={props.indexedPath}
        readOnly={props.readOnly}
        renderChild={props.renderChild}
        schema={schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  // Container types (block objects with child fields) render as non-void
  // elements with editable children. Use the registered renderer if available.
  if (isContainerType(schema, props.element._type)) {
    return (
      <RenderContainer attributes={props.attributes} element={props.element}>
        {props.children}
      </RenderContainer>
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
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      schema={schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}

function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextObject
}) {
  const scope = useContext(ContainerScopeContext)
  const rendererConfig = useRenderer('blockObject', props.element._type, scope)

  if (rendererConfig) {
    return rendererConfig.renderer.render({
      attributes: props.attributes,
      children: props.children,
      node: props.element,
    })
  }

  // Default container rendering - just a div wrapper
  return (
    <div {...props.attributes} style={{position: 'relative'}}>
      {props.children}
    </div>
  )
}
