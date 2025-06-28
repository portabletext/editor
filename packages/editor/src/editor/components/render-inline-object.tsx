import {useRef, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {DOMEditor} from 'slate-dom'
import {
  useSelected,
  useSlateSelector,
  useSlateStatic,
  type RenderElementProps,
} from 'slate-react'
import {getPointBlock} from '../../internal-utils/slate-utils'
import type {
  PortableTextMemberSchemaTypes,
  RenderChildFunction,
} from '../../types/editor'
import type {EditorSchema} from '../editor-schema'
import {RenderDefaultInlineObject} from './render-default-object'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderChild?: RenderChildFunction
  schema: EditorSchema
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)
  const slateEditor = useSlateStatic()
  const selected = useSelected()
  const focused = useSlateSelector(
    (editor) =>
      selected &&
      editor.selection !== null &&
      Range.isCollapsed(editor.selection),
  )

  const legacySchemaType = props.legacySchema.inlineObjects.find(
    (inlineObject) => inlineObject.name === props.element._type,
  )

  if (!legacySchemaType) {
    console.error(
      `Unable to find Inline Object "${props.element._type}" in Schema`,
    )
  }

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

  const inlineObject = {
    _key: props.element._key,
    _type: props.element._type,
    ...('value' in props.element && typeof props.element.value === 'object'
      ? props.element.value
      : {}),
  }

  return (
    <span
      {...props.attributes}
      draggable={!props.readOnly}
      className="pt-inline-object"
      data-child-key={inlineObject._key}
      data-child-name={inlineObject._type}
      data-child-type="object"
    >
      {props.children}
      <span ref={inlineObjectRef} style={{display: 'inline-block'}}>
        {props.renderChild && block && legacySchemaType ? (
          props.renderChild({
            annotations: [],
            children: <RenderDefaultInlineObject inlineObject={inlineObject} />,
            editorElementRef: inlineObjectRef,
            selected,
            focused,
            path: [{_key: block._key}, 'children', {_key: props.element._key}],
            schemaType: legacySchemaType,
            value: inlineObject,
            type: legacySchemaType,
          })
        ) : (
          <RenderDefaultInlineObject inlineObject={inlineObject} />
        )}
      </span>
    </span>
  )
}
