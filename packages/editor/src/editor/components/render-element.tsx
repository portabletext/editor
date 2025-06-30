import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {Element as SlateElement} from 'slate'
import {useSlateStatic, type RenderElementProps} from 'slate-react'
import {isTextBlock} from '../../internal-utils/parse-blocks'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {RenderBlockObject} from './render-block-object'
import {RenderInlineObject} from './render-inline-object'
import {RenderTextBlock} from './render-text-block'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
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

  const blockIndex = slateStatic.blockIndexMap.get(props.element._key)
  const block =
    blockIndex !== undefined ? slateStatic.value.at(blockIndex) : undefined

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
