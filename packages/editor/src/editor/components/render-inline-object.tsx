import type {PortableTextObject} from '@sanity/types'
import {useSelector} from '@xstate/react'
import {useContext, useRef, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {DOMEditor} from 'slate-dom'
import {useSelected, useSlateStatic, type RenderElementProps} from 'slate-react'
import {getPointBlock} from '../../internal-utils/slate-utils'
import type {RenderChildFunction} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {RenderDefaultInlineObject} from './render-default-object'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  inlineObject: PortableTextObject
  readOnly: boolean
  renderChild?: RenderChildFunction
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)

  const slateEditor = useSlateStatic()
  const selected = useSelected()

  const editorActor = useContext(EditorActorContext)
  const legacySchemaType = useSelector(editorActor, (s) =>
    s.context
      .getLegacySchema()
      .inlineObjects.find(
        (inlineObject) => inlineObject.name === props.element._type,
      ),
  )

  if (!legacySchemaType) {
    console.error(
      `Inline object type ${props.element._type} not found in Schema`,
    )
  }

  const focused =
    selected &&
    slateEditor.selection !== null &&
    Range.isCollapsed(slateEditor.selection)
  const path = DOMEditor.findPath(slateEditor, props.element)
  const [block] = getPointBlock({
    editor: slateEditor,
    point: {
      path,
      offset: 0,
    },
  })

  if (!block) {
    console.error(
      `Unable to find parent block of inline object ${props.element._key}`,
    )
  }

  return (
    <span
      {...props.attributes}
      draggable={!props.readOnly}
      className="pt-inline-object"
      data-child-key={props.inlineObject._key}
      data-child-name={props.inlineObject._type}
      data-child-type="object"
    >
      {props.children}
      <span ref={inlineObjectRef} style={{display: 'inline-block'}}>
        {props.renderChild && block && legacySchemaType ? (
          props.renderChild({
            annotations: [],
            children: (
              <RenderDefaultInlineObject inlineObject={props.inlineObject} />
            ),
            editorElementRef: inlineObjectRef,
            selected,
            focused,
            path: [{_key: block._key}, 'children', {_key: props.element._key}],
            schemaType: legacySchemaType,
            value: props.inlineObject,
            type: legacySchemaType,
          })
        ) : (
          <RenderDefaultInlineObject inlineObject={props.inlineObject} />
        )}
      </span>
    </span>
  )
}
