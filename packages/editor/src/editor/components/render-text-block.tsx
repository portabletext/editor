import type {PortableTextTextBlock} from '@sanity/types'
import {useSelector} from '@xstate/react'
import {useContext, useRef, useState, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {useSelected, useSlateStatic, type RenderElementProps} from 'slate-react'
import type {EventPositionBlock} from '../../internal-utils/event-position'
import type {
  RenderBlockFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {DropIndicator} from './drop-indicator'
import {useCoreBlockElementBehaviors} from './use-core-block-element-behaviors'

export function RenderTextBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  spellCheck?: boolean
  textBlock: PortableTextTextBlock
}) {
  const [dragPositionBlock, setDragPositionBlock] =
    useState<EventPositionBlock>()
  const blockRef = useRef<HTMLDivElement>(null)

  const slateEditor = useSlateStatic()
  const selected = useSelected()

  const editorActor = useContext(EditorActorContext)

  useCoreBlockElementBehaviors({
    key: props.element._key,
    onSetDragPositionBlock: setDragPositionBlock,
  })

  const legacySchema = useSelector(editorActor, (s) =>
    s.context.getLegacySchema(),
  )

  const focused =
    selected &&
    slateEditor.selection !== null &&
    Range.isCollapsed(slateEditor.selection)

  let children = props.children

  const legacyBlockSchemaType = legacySchema.block

  if (props.renderStyle && props.textBlock.style) {
    const legacyStyleSchemaType =
      props.textBlock.style !== undefined
        ? legacySchema.styles.find(
            (style) => style.value === props.textBlock.style,
          )
        : undefined

    if (legacyStyleSchemaType) {
      children = props.renderStyle({
        block: props.textBlock,
        children,
        editorElementRef: blockRef,
        focused,
        path: [{_key: props.textBlock._key}],
        schemaType: legacyStyleSchemaType,
        selected,
        value: props.textBlock.style,
      })
    } else {
      console.error(
        `Unable to find Schema type for text block style ${props.textBlock.style}`,
      )
    }
  }

  if (props.renderListItem && props.textBlock.listItem) {
    const legacyListItemSchemaType = legacySchema.lists.find(
      (list) => list.value === props.textBlock.listItem,
    )

    if (legacyListItemSchemaType) {
      children = props.renderListItem({
        block: props.textBlock,
        children,
        editorElementRef: blockRef,
        focused,
        level: props.textBlock.level ?? 1,
        path: [{_key: props.textBlock._key}],
        selected,
        value: props.textBlock.listItem,
        schemaType: legacyListItemSchemaType,
      })
    } else {
      console.error(
        `Unable to find Schema type for text block list item ${props.textBlock.listItem}`,
      )
    }
  }

  return (
    <div
      {...props.attributes}
      className={[
        'pt-block',
        'pt-text-block',
        ...(props.textBlock.style
          ? [`pt-text-block-style-${props.textBlock.style}`]
          : []),
        ...(props.textBlock.listItem
          ? [
              'pt-list-item',
              `pt-list-item-${props.textBlock.listItem}`,
              `pt-list-item-level-${props.textBlock.level ?? 1}`,
            ]
          : []),
      ].join(' ')}
      spellCheck={props.spellCheck}
      data-block-key={props.textBlock._key}
      data-block-name={props.textBlock._type}
      data-block-type="text"
    >
      {dragPositionBlock === 'start' ? <DropIndicator /> : null}
      <div ref={blockRef}>
        {props.renderBlock
          ? props.renderBlock({
              children,
              editorElementRef: blockRef,
              focused,
              level: props.textBlock.level,
              listItem: props.textBlock.listItem,
              path: [{_key: props.textBlock._key}],
              selected,
              schemaType: legacyBlockSchemaType,
              style: props.textBlock.style,
              type: legacyBlockSchemaType,
              value: props.textBlock,
            })
          : props.children}
      </div>
      {dragPositionBlock === 'end' ? <DropIndicator /> : null}
    </div>
  )
}
