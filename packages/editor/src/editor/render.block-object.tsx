import type {PortableTextObject} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Element as SlateElement} from '../slate'
import type {RenderElementProps} from '../slate-react'
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
  element: SlateElement
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  schema: EditorSchema
}) {
  const blockObjectRef = useRef<HTMLDivElement>(null)

  const {selectedBlockKeys, focusedBlockKey} = useContext(SelectionStateContext)
  const selected = selectedBlockKeys.has(props.element._key)
  const focused = focusedBlockKey === props.element._key

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
        {props.renderBlock && blockObjectSchemaType ? (
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
        ) : (
          <RenderDefaultBlockObject blockObject={blockObject} />
        )}
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
