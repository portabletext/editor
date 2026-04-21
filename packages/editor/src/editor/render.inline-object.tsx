import type {PortableTextChild, PortableTextObject} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {LeafConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import type {BlockChildRenderProps, RenderChildFunction} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {RenderDefaultInlineObject} from './render.default-object'
import {RenderLeafConfig} from './render.leaf-config'
import {SelectionStateContext} from './selection-state-context'
import {useBlockSubSchema} from './use-block-sub-schema'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextObject
  leafConfig?: LeafConfig
  path: Path
  readOnly: boolean
  renderChild?: RenderChildFunction
  schema: EditorSchema
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)

  const subSchema = useBlockSubSchema(props.path)

  const inlineObjectSchemaType = subSchema.inlineObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!inlineObjectSchemaType) {
    console.error(
      `Unable to find Inline Object "${props.element._type}" in Schema`,
    )
  }

  const selectionState = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const selected = selectionState.selectedLeafPaths.has(serializedPath)
  const focused = selectionState.focusedLeafPath === serializedPath

  const inlineObject = props.element as unknown as PortableTextChild

  let innerContent: ReactElement
  if (props.renderChild && inlineObjectSchemaType && !props.leafConfig) {
    innerContent = (
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
    )
  } else {
    innerContent = <RenderDefaultInlineObject inlineObject={inlineObject} />
  }

  const attributes = {
    ...props.attributes,
    'className': 'pt-inline-object',
    'data-child-key': inlineObject._key,
    'data-child-name': inlineObject._type,
    'data-child-type': 'object',
  }

  const children = (
    <>
      {props.children}
      <span
        ref={inlineObjectRef}
        style={{display: 'inline-block'}}
        draggable={!props.readOnly}
      >
        {innerContent}
      </span>
    </>
  )

  if (props.leafConfig) {
    return (
      <RenderLeafConfig
        leafConfig={props.leafConfig}
        attributes={attributes}
        focused={focused}
        node={props.element}
        path={props.path}
        selected={selected}
      >
        {children}
      </RenderLeafConfig>
    )
  }

  return <span {...attributes}>{children}</span>
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
