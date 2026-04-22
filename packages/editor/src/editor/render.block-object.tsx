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
import {RenderLeafConfig} from './render.leaf-config'
import {SelectionStateContext} from './selection-state-context'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  blockObject: PortableTextObject | undefined
  dropPosition?: DropPosition['positionBlock']
  children: ReactElement
  element: PortableTextObject
  leafConfig?: LeafConfig
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

  if (props.leafConfig) {
    const {
      'data-slate-node': _slateNode,
      'data-slate-void': _slateVoid,
      ...ptAttributes
    } = props.attributes as Record<string, unknown>
    return (
      <RenderLeafConfig
        leafConfig={props.leafConfig}
        attributes={{
          ...ptAttributes,
          'data-block-type': 'object',
        }}
        focused={focused}
        node={props.element}
        path={props.path}
        selected={selected}
      >
        {props.children}
      </RenderLeafConfig>
    )
  }

  let innerContent: ReactElement
  if (props.renderBlock && blockObjectSchemaType) {
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

  const attributes = {
    ...props.attributes,
    'className': 'pt-block pt-object-block',
    'data-block-key': props.element._key,
    'data-block-name': props.element._type,
    'data-block-type': 'object',
  }

  return (
    <div {...attributes}>
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
