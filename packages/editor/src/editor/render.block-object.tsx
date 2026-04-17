import type {PortableTextObject} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {serializePath} from '../paths/serialize-path'
import type {LeafConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import type {BlockRenderProps, RenderBlockFunction} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {RenderDefaultBlockObject} from './render.default-object'
import {DropIndicator} from './render.drop-indicator'
import {SelectionStateContext} from './selection-state-context'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  blockObject: PortableTextObject | undefined
  dropPosition?: DropPosition['positionBlock']
  children: ReactElement
  element: PortableTextObject
  leafConfig: LeafConfig | undefined
  path: Path
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  schema: EditorSchema
}) {
  const blockObjectRef = useRef<HTMLDivElement>(null)

  const {selectedLeafPaths, focusedLeafPath} = useContext(SelectionStateContext)
  const serializedPath = serializePath(props.path)
  const selected = selectedLeafPaths.has(serializedPath)
  const focused = focusedLeafPath === serializedPath

  const blockObjectSchemaType = props.schema.blockObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!blockObjectSchemaType) {
    console.error(
      `Unable to find Block Object "${props.element._type}" in Schema`,
    )
  }

  const blockObject = props.blockObject ?? {
    _key: props.element._key,
    _type: props.element._type,
  }

  let innerContent: ReactElement
  if (props.leafConfig) {
    innerContent = (
      <RenderLeafConfig
        leafConfig={props.leafConfig}
        focused={focused}
        node={props.element}
        path={props.path}
        selected={selected}
      >
        <RenderDefaultBlockObject blockObject={blockObject} />
      </RenderLeafConfig>
    )
  } else if (props.renderBlock && blockObjectSchemaType) {
    innerContent = (
      <RenderBlock
        renderBlock={props.renderBlock}
        editorElementRef={blockObjectRef}
        focused={focused}
        path={[{_key: props.element._key}]}
        schemaType={blockObjectSchemaType}
        selected={selected}
        value={blockObject}
      >
        <RenderDefaultBlockObject blockObject={blockObject} />
      </RenderBlock>
    )
  } else {
    innerContent = <RenderDefaultBlockObject blockObject={blockObject} />
  }

  return (
    <div
      {...props.attributes}
      className="pt-block pt-object-block"
      data-block-key={props.element._key}
      data-block-name={props.element._type}
      data-block-type="object"
    >
      {props.dropPosition === 'start' ? <DropIndicator /> : null}
      {props.children}
      <div
        ref={blockObjectRef}
        contentEditable={false}
        draggable={!props.readOnly}
      >
        {innerContent}
      </div>
      {props.dropPosition === 'end' ? <DropIndicator /> : null}
    </div>
  )
}

function RenderLeafConfig({
  leafConfig,
  children,
  focused,
  node,
  path,
  selected,
}: {
  leafConfig: LeafConfig
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  selected: boolean
}) {
  const rendered = leafConfig.leaf.render({
    attributes: {},
    children,
    focused,
    node,
    path,
    selected,
  })
  if (rendered === null) {
    return children
  }
  return rendered
}

function RenderBlock({
  renderBlock,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
}: {
  renderBlock: RenderBlockFunction
} & BlockRenderProps) {
  return renderBlock({
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
  })
}
