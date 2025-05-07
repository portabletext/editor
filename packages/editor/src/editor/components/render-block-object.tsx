import type {PortableTextObject} from '@sanity/types'
import {useSelector} from '@xstate/react'
import {useContext, useRef, useState, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {useSelected, useSlateStatic, type RenderElementProps} from 'slate-react'
import type {EventPositionBlock} from '../../internal-utils/event-position'
import type {RenderBlockFunction} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {DropIndicator} from './drop-indicator'
import {RenderDefaultBlockObject} from './render-default-object'
import {useCoreBlockElementBehaviors} from './use-core-block-element-behaviors'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  blockObject: PortableTextObject
  children: ReactElement
  element: SlateElement
  readOnly: boolean
  renderBlock?: RenderBlockFunction
}) {
  const [dragPositionBlock, setDragPositionBlock] =
    useState<EventPositionBlock>()
  const blockObjectRef = useRef<HTMLDivElement>(null)

  const slateEditor = useSlateStatic()
  const selected = useSelected()

  const editorActor = useContext(EditorActorContext)

  useCoreBlockElementBehaviors({
    key: props.element._key,
    onSetDragPositionBlock: setDragPositionBlock,
  })

  const legacySchemaType = useSelector(editorActor, (s) =>
    s.context
      .getLegacySchema()
      .blockObjects.find(
        (blockObject) => blockObject.name === props.element._type,
      ),
  )

  if (!legacySchemaType) {
    console.error(
      `Block object type ${props.element._type} not found in Schema`,
    )
  }

  const focused =
    selected &&
    slateEditor.selection !== null &&
    Range.isCollapsed(slateEditor.selection)

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
            children: (
              <RenderDefaultBlockObject blockObject={props.blockObject} />
            ),
            editorElementRef: blockObjectRef,
            focused,
            path: [{_key: props.element._key}],
            schemaType: legacySchemaType,
            selected,
            type: legacySchemaType,
            value: props.blockObject,
          })
        ) : (
          <RenderDefaultBlockObject blockObject={props.blockObject} />
        )}
      </div>
      {dragPositionBlock === 'end' ? <DropIndicator /> : null}
    </div>
  )
}
