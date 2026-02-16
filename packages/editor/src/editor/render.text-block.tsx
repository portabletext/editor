import type {PortableTextTextBlock} from '@portabletext/schema'
import {useContext, useRef, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Element as SlateElement} from '../slate'
import {useSlateSelector, type RenderElementProps} from '../slate-react'
import type {
  BlockListItemRenderProps,
  BlockRenderProps,
  BlockStyleRenderProps,
  PortableTextMemberSchemaTypes,
  RenderBlockFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {DropIndicator} from './render.drop-indicator'
import {SelectionStateContext} from './selection-state-context'

export function RenderTextBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition['positionBlock']
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  spellCheck?: boolean
  textBlock: PortableTextTextBlock
}) {
  const blockRef = useRef<HTMLDivElement>(null)

  const {selectedBlockKeys, focusedBlockKey} = useContext(SelectionStateContext)
  const selected = selectedBlockKeys.has(props.textBlock._key)
  const focused = focusedBlockKey === props.textBlock._key
  const listIndex = useSlateSelector((editor) =>
    editor.listIndexMap.get(props.textBlock._key),
  )

  let children = props.children

  if (props.renderStyle && props.textBlock.style) {
    const legacyStyleSchemaType =
      props.textBlock.style !== undefined
        ? props.legacySchema.styles.find(
            (style) => style.value === props.textBlock.style,
          )
        : undefined

    if (legacyStyleSchemaType) {
      children = (
        <RenderStyle
          renderStyle={props.renderStyle}
          block={props.textBlock}
          editorElementRef={blockRef}
          focused={focused}
          path={[{_key: props.textBlock._key}]}
          schemaType={legacyStyleSchemaType}
          selected={selected}
          value={props.textBlock.style}
        >
          {children}
        </RenderStyle>
      )
    } else {
      console.error(
        `Unable to find Schema type for text block style ${props.textBlock.style}`,
      )
    }
  }

  if (props.renderListItem && props.textBlock.listItem) {
    const legacyListItemSchemaType = props.legacySchema.lists.find(
      (list) => list.value === props.textBlock.listItem,
    )

    if (legacyListItemSchemaType) {
      children = (
        <RenderListItem
          renderListItem={props.renderListItem}
          block={props.textBlock}
          editorElementRef={blockRef}
          focused={focused}
          level={props.textBlock.level ?? 1}
          path={[{_key: props.textBlock._key}]}
          selected={selected}
          value={props.textBlock.listItem}
          schemaType={legacyListItemSchemaType}
        >
          {children}
        </RenderListItem>
      )
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
      {...(props.textBlock.listItem !== undefined
        ? {
            'data-list-item': props.textBlock.listItem,
          }
        : {})}
      {...(props.textBlock.level !== undefined
        ? {
            'data-level': props.textBlock.level,
          }
        : {})}
      {...(props.textBlock.style !== undefined
        ? {
            'data-style': props.textBlock.style,
          }
        : {})}
      {...(listIndex !== undefined
        ? {
            'data-list-index': listIndex,
          }
        : {})}
    >
      {props.dropPosition === 'start' ? <DropIndicator /> : null}
      <div ref={blockRef}>
        {props.renderBlock ? (
          <RenderBlock
            renderBlock={props.renderBlock}
            editorElementRef={blockRef}
            focused={focused}
            level={props.textBlock.level}
            listItem={props.textBlock.listItem}
            path={[{_key: props.textBlock._key}]}
            selected={selected}
            schemaType={props.legacySchema.block}
            style={props.textBlock.style}
            type={props.legacySchema.block}
            value={props.textBlock}
          >
            {children}
          </RenderBlock>
        ) : (
          children
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
  level,
  listItem,
  path,
  selected,
  style,
  schemaType,
  type,
  value,
}: {
  renderBlock: RenderBlockFunction
} & BlockRenderProps) {
  return renderBlock({
    children,
    editorElementRef,
    focused,
    level,
    listItem,
    path,
    selected,
    style,
    schemaType,
    type,
    value,
  })
}

function RenderListItem({
  renderListItem,
  block,
  children,
  editorElementRef,
  focused,
  level,
  path,
  schemaType,
  selected,
  value,
}: {
  renderListItem: RenderListItemFunction
} & BlockListItemRenderProps) {
  return renderListItem({
    block,
    children,
    editorElementRef,
    focused,
    level,
    path,
    schemaType,
    selected,
    value,
  })
}

function RenderStyle({
  renderStyle,
  block,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
}: {
  renderStyle: RenderStyleFunction
} & BlockStyleRenderProps) {
  return renderStyle({
    block,
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
  })
}
