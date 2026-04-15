import type {PortableTextChild, PortableTextObject} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import type {BlockChildRenderProps, RenderChildFunction} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {RenderDefaultInlineObject} from './render.default-object'
import {SelectionStateContext} from './selection-state-context'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextObject
  path: Path
  readOnly: boolean
  renderChild?: RenderChildFunction
  schema: EditorSchema
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)

  const inlineObjectSchemaType = props.schema.inlineObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!inlineObjectSchemaType) {
    console.error(
      `Unable to find Inline Object "${props.element._type}" in Schema`,
    )
  }

  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const selected = selectionState.selectedChildPaths.has(serializedPath)
  const focused = selectionState.focusedChildPath === serializedPath

  const inlineObject = props.element as unknown as PortableTextChild

  return (
    <span
      {...props.attributes}
      className="pt-inline-object"
      data-child-key={inlineObject._key}
      data-child-name={inlineObject._type}
      data-child-type="object"
    >
      {props.children}
      <span
        ref={inlineObjectRef}
        style={{display: 'inline-block'}}
        draggable={!props.readOnly}
      >
        {props.renderChild && inlineObjectSchemaType ? (
          <RenderChild
            renderChild={props.renderChild}
            annotations={[]}
            editorElementRef={inlineObjectRef}
            selected={selected}
            focused={focused}
            path={props.path}
            schemaType={inlineObjectSchemaType}
            value={inlineObject}
          >
            <RenderDefaultInlineObject inlineObject={inlineObject} />
          </RenderChild>
        ) : (
          <RenderDefaultInlineObject inlineObject={inlineObject} />
        )}
      </span>
    </span>
  )
}

function RenderChild({
  renderChild,
  annotations,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
}: {
  renderChild: RenderChildFunction
} & BlockChildRenderProps) {
  return renderChild({
    annotations,
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
  })
}
