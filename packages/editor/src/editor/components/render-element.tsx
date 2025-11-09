import {isContainerBlock, isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {Element as SlateElement} from 'slate'
import {useSlateStatic, type RenderElementProps} from 'slate-react'
import {getBlockByPath} from '../../internal-utils/block-path-utils'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderContainerBlockFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {RenderBlockObject} from './render-block-object'
import {RenderContainerBlock} from './render-container-block'
import {RenderInlineObject} from './render-inline-object'
import {RenderTextBlock} from './render-text-block'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderContainerBlock?: RenderContainerBlockFunction
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

  const isInline =
    '__inline' in props.element && props.element.__inline === true

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

  const blockPath = slateStatic.blockIndexMap.get(props.element._key)
  const block =
    blockPath !== undefined
      ? getBlockByPath({schema, value: slateStatic.value}, blockPath)
      : undefined

  if (isTextBlock({schema}, block)) {
    return (
      <RenderTextBlock
        attributes={props.attributes}
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

  if (isContainerBlock({schema}, block)) {
    return (
      <RenderContainerBlock
        attributes={props.attributes}
        renderContainerBlock={props.renderContainerBlock}
        block={block}
      >
        {props.children}
      </RenderContainerBlock>
    )
  }

  return (
    <RenderBlockObject
      attributes={props.attributes}
      blockObject={block}
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
