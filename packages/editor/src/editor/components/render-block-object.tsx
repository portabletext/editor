import type {PortableTextObject} from '@sanity/types'
import {useRef, useState, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {
  useSelected,
  useSlateSelector,
  type RenderElementProps,
} from 'slate-react'
import type {EventPositionBlock} from '../../internal-utils/event-position'
import type {
  PortableTextMemberSchemaTypes,
  RenderBlockFunction,
} from '../../types/editor'
import type {EditorSchema} from '../editor-schema'
import {DropIndicator} from './drop-indicator'
import {RenderDefaultBlockObject} from './render-default-object'
import {useCoreBlockElementBehaviors} from './use-core-block-element-behaviors'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  blockObject: PortableTextObject | undefined
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  schema: EditorSchema
}) {
  const [dragPositionBlock, setDragPositionBlock] =
    useState<EventPositionBlock>()
  const blockObjectRef = useRef<HTMLDivElement>(null)
  const selected = useSelected()
  const focused = useSlateSelector(
    (editor) =>
      selected &&
      editor.selection !== null &&
      Range.isCollapsed(editor.selection),
  )

  useCoreBlockElementBehaviors({
    key: props.element._key,
    onSetDragPositionBlock: setDragPositionBlock,
  })

  const legacySchemaType = props.legacySchema.blockObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!legacySchemaType) {
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
      {dragPositionBlock === 'start' ? <DropIndicator /> : null}
      {props.children}
      <div
        ref={blockObjectRef}
        contentEditable={false}
        draggable={!props.readOnly}
      >
        {props.renderBlock && legacySchemaType ? (
          props.renderBlock({
            children: <RenderDefaultBlockObject blockObject={blockObject} />,
            editorElementRef: blockObjectRef,
            focused,
            path: [{_key: props.element._key}],
            schemaType: legacySchemaType,
            selected,
            type: legacySchemaType,
            value: blockObject,
          })
        ) : (
          <RenderDefaultBlockObject blockObject={blockObject} />
        )}
      </div>
      {dragPositionBlock === 'end' ? <DropIndicator /> : null}
    </div>
  )
}
