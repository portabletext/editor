import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {Element as SlateElement} from 'slate'
import {useSlateSelector, type RenderElementProps} from 'slate-react'
import {isTextBlock} from '../../internal-utils/parse-blocks'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {RenderObject} from './render-object'
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
  const textBlock = useSlateSelector((editor) => {
    const index = editor.blockIndexMap.get(props.element._key)
    const block = index !== undefined ? editor.value.at(index) : undefined

    return isTextBlock({schema}, block) ? block : undefined
  })

  if (textBlock) {
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
        textBlock={textBlock}
      >
        {props.children}
      </RenderTextBlock>
    )
  }

  return (
    <RenderObject
      attributes={props.attributes}
      element={props.element}
      legacySchema={legacySchema}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      renderChild={props.renderChild}
      schema={schema}
    >
      {props.children}
    </RenderObject>
  )
}
