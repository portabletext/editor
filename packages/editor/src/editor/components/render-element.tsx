import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {Element as SlateElement} from 'slate'
import type {RenderElementProps} from 'slate-react'
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
  const isInline =
    '__inline' in props.element && props.element.__inline === true

  if (isInline) {
    const inlineObject = {
      _key: props.element._key,
      _type: props.element._type,
      ...('value' in props.element && typeof props.element.value === 'object'
        ? props.element.value
        : {}),
    }

    if (
      !schema.inlineObjects.find(
        (inlineObject) => inlineObject.name === props.element._type,
      )
    ) {
      console.error(
        `Unable to find Inline Object "${props.element._type}" in Schema`,
      )
    }

    return (
      <RenderInlineObject
        attributes={props.attributes}
        element={props.element}
        inlineObject={
          inlineObject ?? {
            _key: props.element._key,
            _type: props.element._type,
          }
        }
        readOnly={props.readOnly}
        renderChild={props.renderChild}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    return (
      <RenderTextBlock
        attributes={props.attributes}
        element={props.element}
        readOnly={props.readOnly}
        renderBlock={props.renderBlock}
        renderListItem={props.renderListItem}
        renderStyle={props.renderStyle}
        spellCheck={props.spellCheck}
        textBlock={props.element}
      >
        {props.children}
      </RenderTextBlock>
    )
  }

  const blockObject = {
    _key: props.element._key,
    _type: props.element._type,
    ...('value' in props.element && typeof props.element.value === 'object'
      ? props.element.value
      : {}),
  }

  if (
    !schema.blockObjects.find(
      (blockObject) => blockObject.name === props.element._type,
    )
  ) {
    console.error(
      `Unable to find Block Object "${props.element._type}" in Schema`,
    )
  }

  return (
    <RenderBlockObject
      attributes={props.attributes}
      blockObject={
        blockObject ?? {
          _key: props.element._key,
          _type: props.element._type,
        }
      }
      element={props.element}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
    >
      {props.children}
    </RenderBlockObject>
  )
}
