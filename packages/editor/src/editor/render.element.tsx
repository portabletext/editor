import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {isInline} from '../node-traversal/is-inline'
import type {RendererConfig} from '../renderers/renderer.types'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {useContainerScope} from './container-scope-context'
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
  const containerScope = useContainerScope()

  const scopedName = containerScope
    ? `${containerScope.name}.${props.element._type}`
    : props.element._type

  const rendererConfig: RendererConfig | undefined = useSelector(
    editorActor,
    (s) => s.context.renderers.get(scopedName),
  )

  if (isTextBlock({schema}, props.element)) {
    // Text blocks inside containers render minimal (no renderBlock/renderStyle/renderListItem)
    if (containerScope) {
      return <div {...props.attributes}>{props.children}</div>
    }

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

  if (isInline(slateStatic, props.indexedPath)) {
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

  if (rendererConfig) {
    return rendererConfig.renderer.render({
      attributes: props.attributes,
      children: props.children,
      node: props.element,
    })
  }

  // Editable container types without a registered renderer get a default div wrapper
  if (slateStatic.editableTypes.has(scopedName)) {
    return <div {...props.attributes}>{props.children}</div>
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
