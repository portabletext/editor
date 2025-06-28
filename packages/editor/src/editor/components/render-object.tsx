import type {ReactElement} from 'react'
import type {Element as SlateElement} from 'slate'
import type {RenderElementProps} from 'slate-react'
import type {
  PortableTextMemberSchemaTypes,
  RenderBlockFunction,
  RenderChildFunction,
} from '../../types/editor'
import type {EditorSchema} from '../editor-schema'
import {RenderBlockObject} from './render-block-object'
import {RenderInlineObject} from './render-inline-object'

export function RenderObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  schema: EditorSchema
}) {
  const isInline =
    '__inline' in props.element && props.element.__inline === true

  if (isInline) {
    return (
      <RenderInlineObject
        attributes={props.attributes}
        element={props.element}
        legacySchema={props.legacySchema}
        readOnly={props.readOnly}
        renderChild={props.renderChild}
        schema={props.schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  return (
    <RenderBlockObject
      attributes={props.attributes}
      element={props.element}
      legacySchema={props.legacySchema}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      schema={props.schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}
