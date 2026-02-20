import {isTextBlock, type PortableTextObject} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Element as SlateElement} from '../slate'
import {useSlateStatic, type RenderElementProps} from '../slate-react'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import {RenderBlockObject} from './render.block-object'
import {RenderInlineObject} from './render.inline-object'
import {RenderTextBlock} from './render.text-block'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition
  element: SlateElement
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  spellCheck?: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const schema = useSelector(editorActor, (s) => s.context.schema)
  const legacySchema = useSelector(editorActor, (s) =>
    s.context.getLegacySchema(),
  )
  const slateStatic = useSlateStatic()

  const isInline = schema.inlineObjects.some(
    (obj) => obj.name === props.element._type,
  )

  if (isInline) {
    return (
      <RenderInlineObject
        attributes={props.attributes}
        element={props.element}
        legacySchema={legacySchema}
        readOnly={props.readOnly}
        renderChild={props.renderChild}
        schema={schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  const blockIndex = slateStatic.blockIndexMap.get(props.element._key)
  const block =
    blockIndex !== undefined ? slateStatic.children.at(blockIndex) : undefined

  if (isTextBlock({schema}, block)) {
    return (
      <RenderTextBlock
        attributes={props.attributes}
        dropPosition={
          props.dropPosition?.blockKey === props.element._key
            ? props.dropPosition.positionBlock
            : undefined
        }
        element={props.element}
        legacySchema={legacySchema}
        readOnly={props.readOnly}
        renderBlock={props.renderBlock}
        renderListItem={props.renderListItem}
        renderStyle={props.renderStyle}
        spellCheck={props.spellCheck}
        textBlock={block}
      >
        {props.children}
      </RenderTextBlock>
    )
  }

  return (
    <RenderBlockObject
      attributes={props.attributes}
      blockObject={block as PortableTextObject | undefined}
      dropPosition={
        props.dropPosition?.blockKey === props.element._key
          ? props.dropPosition.positionBlock
          : undefined
      }
      element={props.element}
      legacySchema={legacySchema}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      schema={schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}
