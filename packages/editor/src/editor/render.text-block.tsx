import type {PortableTextTextBlock} from '@portabletext/schema'
import {useContext, useRef, useState, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {
  useSelected,
  useSlateSelector,
  useSlateStatic,
  type RenderElementProps,
} from 'slate-react'
import type {EventPositionBlock} from '../internal-utils/event-position'
import {findMatchingRenderer, useRenderers} from '../renderers/use-renderer'
import type {
  BlockListItemRenderProps,
  BlockRenderProps,
  BlockStyleRenderProps,
  PortableTextMemberSchemaTypes,
  RenderBlockFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'
import {DropIndicator} from './render.drop-indicator'
import {useCoreBlockElementBehaviors} from './use-core-block-element-behaviors'

export function RenderTextBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
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
  const editorActor = useContext(EditorActorContext)

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

  // Get registered renderers
  const registeredRenderers = useRenderers('block', props.textBlock._type)

  // Lazy snapshot getter - only compute when guards need it
  const getSnapshot = () =>
    getEditorSnapshot({
      editorActorSnapshot: editorActor.getSnapshot(),
      slateEditorInstance: slateEditor,
    })

  const listIndex = useSlateSelector((editor) =>
    editor.listIndexMap.get(props.textBlock._key),
  )

  // Find matching renderer (first whose guard passes)
  const match = findMatchingRenderer(
    registeredRenderers,
    props.textBlock,
    getSnapshot,
  )

  // If there's a matching renderer, use it (full DOM control)
  if (match) {
    const renderDefault = () => (
      <DefaultTextBlockRender
        {...props}
        dragPositionBlock={dragPositionBlock}
        blockRef={blockRef}
        listIndex={listIndex}
        focused={focused}
        selected={selected}
      />
    )

    const renderHidden = () => (
      <div {...props.attributes} style={{display: 'none'}}>
        {props.children}
      </div>
    )

    return match.renderer.renderer.render(
      {
        attributes: props.attributes,
        children: props.children,
        node: props.textBlock,
        renderDefault,
        renderHidden,
      },
      match.guardResponse,
    )
  }

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
      {dragPositionBlock === 'start' ? <DropIndicator /> : null}
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
      {dragPositionBlock === 'end' ? <DropIndicator /> : null}
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

function DefaultTextBlockRender(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  spellCheck?: boolean
  textBlock: PortableTextTextBlock
  dragPositionBlock: EventPositionBlock | undefined
  blockRef: React.RefObject<HTMLDivElement | null>
  listIndex: number | undefined
  focused: boolean
  selected: boolean
}) {
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
          editorElementRef={props.blockRef}
          focused={props.focused}
          path={[{_key: props.textBlock._key}]}
          schemaType={legacyStyleSchemaType}
          selected={props.selected}
          value={props.textBlock.style}
        >
          {children}
        </RenderStyle>
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
          editorElementRef={props.blockRef}
          focused={props.focused}
          level={props.textBlock.level ?? 1}
          path={[{_key: props.textBlock._key}]}
          selected={props.selected}
          value={props.textBlock.listItem}
          schemaType={legacyListItemSchemaType}
        >
          {children}
        </RenderListItem>
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
      {...(props.listIndex !== undefined
        ? {
            'data-list-index': props.listIndex,
          }
        : {})}
    >
      {props.dragPositionBlock === 'start' ? <DropIndicator /> : null}
      <div ref={props.blockRef}>
        {props.renderBlock ? (
          <RenderBlock
            renderBlock={props.renderBlock}
            editorElementRef={props.blockRef}
            focused={props.focused}
            level={props.textBlock.level}
            listItem={props.textBlock.listItem}
            path={[{_key: props.textBlock._key}]}
            selected={props.selected}
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
      {props.dragPositionBlock === 'end' ? <DropIndicator /> : null}
    </div>
  )
}
