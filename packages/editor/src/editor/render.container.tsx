import type {PortableTextObject} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Element as SlateElement} from '../slate'
import type {RenderElementProps} from '../slate-react'
import type {
  ContainerRenderProps,
  RenderContainerFunction,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {DropIndicator} from './render.drop-indicator'
import {SelectionStateContext} from './selection-state-context'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition['positionBlock']
  element: SlateElement
  readOnly: boolean
  renderContainer?: RenderContainerFunction
  schema: EditorSchema
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {selectedBlockKeys, focusedBlockKey} = useContext(SelectionStateContext)
  const selected = selectedBlockKeys.has(props.element._key)
  const focused = focusedBlockKey === props.element._key

  const containerSchemaType = props.schema.containers.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  const containerValue: PortableTextObject = {
    _key: props.element._key,
    _type: props.element._type,
  }

  return (
    <div
      {...props.attributes}
      className="pt-block pt-container-block"
      data-block-key={props.element._key}
      data-block-name={props.element._type}
      data-block-type="container"
    >
      {props.dropPosition === 'start' ? <DropIndicator /> : null}
      {props.renderContainer && containerSchemaType ? (
        <RenderContainerBlock
          renderContainer={props.renderContainer}
          editorElementRef={containerRef}
          focused={focused}
          path={[{_key: props.element._key}]}
          schemaType={containerSchemaType}
          selected={selected}
          value={containerValue}
        >
          {props.children}
        </RenderContainerBlock>
      ) : (
        <div ref={containerRef}>{props.children}</div>
      )}
      {props.dropPosition === 'end' ? <DropIndicator /> : null}
    </div>
  )
}

function RenderContainerBlock({
  renderContainer,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
}: {
  renderContainer: RenderContainerFunction
} & ContainerRenderProps) {
  return renderContainer({
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
  })
}
