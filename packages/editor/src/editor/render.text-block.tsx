import type {
  BlockObjectSchemaType,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {useRef, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Path} from '../engine/interfaces/path'
import {useEngineSelector} from '../engine/react/hooks/use-engine-selector'
import {serializePath} from '../paths/serialize-path'
import type {
  BlockListItemRenderProps,
  BlockRenderProps,
  BlockStyleRenderProps,
  RenderBlockFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import type {LegacyRenderHooks} from './legacy-render-hooks'
import type {RenderElementProps} from './render-props-types'
import {DropIndicator} from './render.drop-indicator'
import {
  useIsFocusedContainer,
  useIsSelectedContainer,
} from './selection-state-context'
import {useBlockSubSchema} from './use-block-sub-schema'

export function RenderTextBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition['position']
  element: PortableTextTextBlock
  legacy: LegacyRenderHooks
  path: Path
  readOnly: boolean
  schema: EditorSchema
  textBlock: PortableTextTextBlock
}) {
  const blockRef = useRef<HTMLDivElement>(null)
  const schemaType = {
    name: props.schema.block.name,
    fields: props.schema.block.fields ?? [],
  } satisfies BlockObjectSchemaType
  const serializedPath = serializePath(props.path)
  const selected = useIsSelectedContainer(serializedPath)
  const focused = useIsFocusedContainer(serializedPath)
  const listIndex = useEngineSelector((editor) =>
    editor.listIndexMap.get(props.textBlock._key),
  )
  const subSchema = useBlockSubSchema(props.path)

  let children = props.children

  if (props.legacy.renderStyle && props.textBlock.style) {
    const styleSchemaType =
      props.textBlock.style !== undefined
        ? subSchema.styles.find(
            (style) => style.value === props.textBlock.style,
          )
        : undefined

    if (styleSchemaType) {
      children = (
        <RenderStyle
          renderStyle={props.legacy.renderStyle}
          block={props.textBlock}
          editorElementRef={blockRef}
          focused={focused}
          path={[{_key: props.textBlock._key}]}
          schemaType={styleSchemaType}
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

  if (props.legacy.renderListItem && props.textBlock.listItem) {
    const listItemSchemaType = subSchema.lists.find(
      (list) => list.value === props.textBlock.listItem,
    )

    if (listItemSchemaType) {
      children = (
        <RenderListItem
          renderListItem={props.legacy.renderListItem}
          block={props.textBlock}
          editorElementRef={blockRef}
          focused={focused}
          level={props.textBlock.level ?? 1}
          path={[{_key: props.textBlock._key}]}
          selected={selected}
          value={props.textBlock.listItem}
          schemaType={listItemSchemaType}
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
      data-block-key={props.textBlock._key}
      data-block-name={props.textBlock._type}
      data-block-type="text"
      data-pt-block="text"
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
        {props.legacy.renderBlock ? (
          <RenderBlock
            renderBlock={props.legacy.renderBlock}
            editorElementRef={blockRef}
            focused={focused}
            level={props.textBlock.level}
            listItem={props.textBlock.listItem}
            path={[{_key: props.textBlock._key}]}
            selected={selected}
            schemaType={schemaType}
            style={props.textBlock.style}
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
