import {useContext, useRef, type ReactElement} from 'react'
import {getPointBlock} from '../internal-utils/slate-utils'
import type {Element as SlateElement} from '../slate'
import {DOMEditor} from '../slate-dom'
import type {RenderElementProps} from '../slate-react'
import {useSlateStatic} from '../slate-react'
import type {BlockChildRenderProps, RenderChildFunction} from '../types/editor'
import {serializePath} from '../utils/util.serialize-path'
import type {EditorSchema} from './editor-schema'
import {RenderDefaultInlineObject} from './render.default-object'
import {SelectionStateContext} from './selection-state-context'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  readOnly: boolean
  renderChild?: RenderChildFunction
  schema: EditorSchema
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)
  const slateEditor = useSlateStatic()

  const inlineObjectSchemaType = props.schema.inlineObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!inlineObjectSchemaType) {
    console.error(
      `Unable to find Inline Object "${props.element._type}" in Schema`,
    )
  }

  const slatePath = DOMEditor.findPath(slateEditor, props.element)
  const [block] = getPointBlock({
    editor: slateEditor,
    point: {
      path: slatePath,
      offset: 0,
    },
  })

  if (!block) {
    console.error(
      `Unable to find parent block of inline object ${props.element._key}`,
    )
  }

  const path = block
    ? [{_key: block._key}, 'children', {_key: props.element._key}]
    : undefined

  const selectionState = useContext(SelectionStateContext)
  const serializedPath = path ? serializePath(path) : undefined
  const selected = serializedPath
    ? selectionState.selectedChildPaths.has(serializedPath)
    : false
  const focused = serializedPath
    ? selectionState.focusedChildPath === serializedPath
    : false

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
        {props.renderChild && path && inlineObjectSchemaType ? (
          <RenderChild
            renderChild={props.renderChild}
            annotations={[]}
            editorElementRef={inlineObjectRef}
            selected={selected}
            focused={focused}
            path={path}
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
