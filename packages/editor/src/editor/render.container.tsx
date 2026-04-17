import type {
  BlockObjectSchemaType,
  PortableTextBlock,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useContext, useRef, type ReactElement, type ReactNode} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {serializePath} from '../paths/serialize-path'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateSelector} from '../slate/react/hooks/use-slate-selector'
import type {
  BlockListItemRenderProps,
  BlockRenderProps,
  BlockStyleRenderProps,
  RenderBlockFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {DropIndicator} from './render.drop-indicator'
import {SelectionStateContext} from './selection-state-context'

type LegacyTextBlockCallbacks = {
  dropPosition?: DropPosition['positionBlock']
  renderBlock?: RenderBlockFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  schema: EditorSchema
  spellCheck?: boolean
}

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactNode
  element: PortableTextBlock
  containerConfig?: ContainerConfig
  legacyCallbacks?: LegacyTextBlockCallbacks
  path: Path
}) {
  if (props.containerConfig) {
    const containerAttributes = {
      ...props.attributes,
      'data-pt-container': '',
    }

    const rendered = props.containerConfig.container.render
      ? props.containerConfig.container.render({
          attributes: containerAttributes,
          children: props.children as ReactElement,
          node: props.element,
          path: props.path,
        })
      : null

    if (rendered !== null) {
      return rendered
    }

    return <div {...containerAttributes}>{props.children}</div>
  }

  if (
    props.legacyCallbacks &&
    isTextBlock({schema: props.legacyCallbacks.schema}, props.element)
  ) {
    return (
      <RenderLegacyTextBlock
        attributes={props.attributes}
        callbacks={props.legacyCallbacks}
        path={props.path}
        textBlock={props.element}
      >
        {props.children}
      </RenderLegacyTextBlock>
    )
  }

  return (
    <div data-pt-container="" {...props.attributes}>
      {props.children}
    </div>
  )
}

function RenderLegacyTextBlock(props: {
  attributes: RenderElementProps['attributes']
  callbacks: LegacyTextBlockCallbacks
  children: ReactNode
  path: Path
  textBlock: PortableTextTextBlock
}) {
  const {attributes, callbacks, path, textBlock} = props
  const {
    dropPosition,
    renderBlock,
    renderListItem,
    renderStyle,
    schema,
    spellCheck,
  } = callbacks
  const blockRef = useRef<HTMLDivElement>(null)
  const schemaType = {
    name: schema.block.name,
    fields: schema.block.fields ?? [],
  } satisfies BlockObjectSchemaType
  const serializedPath = serializePath(path)
  const {selectedContainerPaths, focusedContainerPath} = useContext(
    SelectionStateContext,
  )
  const selected = selectedContainerPaths.has(serializedPath)
  const focused = focusedContainerPath === serializedPath
  const listIndex = useSlateSelector((editor) =>
    editor.listIndexMap.get(textBlock._key),
  )

  let children: ReactElement = props.children as ReactElement

  if (renderStyle && textBlock.style) {
    const styleSchemaType =
      textBlock.style !== undefined
        ? schema.styles.find((style) => style.value === textBlock.style)
        : undefined

    if (styleSchemaType) {
      children = (
        <RenderStyle
          renderStyle={renderStyle}
          block={textBlock}
          editorElementRef={blockRef}
          focused={focused}
          path={[{_key: textBlock._key}]}
          schemaType={styleSchemaType}
          selected={selected}
          value={textBlock.style}
        >
          {children}
        </RenderStyle>
      )
    } else {
      console.error(
        `Unable to find Schema type for text block style ${textBlock.style}`,
      )
    }
  }

  if (renderListItem && textBlock.listItem) {
    const listItemSchemaType = schema.lists.find(
      (list) => list.value === textBlock.listItem,
    )

    if (listItemSchemaType) {
      children = (
        <RenderListItem
          renderListItem={renderListItem}
          block={textBlock}
          editorElementRef={blockRef}
          focused={focused}
          level={textBlock.level ?? 1}
          path={[{_key: textBlock._key}]}
          selected={selected}
          value={textBlock.listItem}
          schemaType={listItemSchemaType}
        >
          {children}
        </RenderListItem>
      )
    } else {
      console.error(
        `Unable to find Schema type for text block list item ${textBlock.listItem}`,
      )
    }
  }

  return (
    <div
      data-slate-node="element"
      data-pt-container=""
      {...attributes}
      className={[
        'pt-block',
        'pt-text-block',
        ...(textBlock.style ? [`pt-text-block-style-${textBlock.style}`] : []),
        ...(textBlock.listItem
          ? [
              'pt-list-item',
              `pt-list-item-${textBlock.listItem}`,
              `pt-list-item-level-${textBlock.level ?? 1}`,
            ]
          : []),
      ].join(' ')}
      spellCheck={spellCheck}
      data-block-key={textBlock._key}
      data-block-name={textBlock._type}
      data-block-type="text"
      {...(textBlock.listItem !== undefined
        ? {
            'data-list-item': textBlock.listItem,
          }
        : {})}
      {...(textBlock.level !== undefined
        ? {
            'data-level': textBlock.level,
          }
        : {})}
      {...(textBlock.style !== undefined
        ? {
            'data-style': textBlock.style,
          }
        : {})}
      {...(listIndex !== undefined
        ? {
            'data-list-index': listIndex,
          }
        : {})}
    >
      {dropPosition === 'start' ? <DropIndicator /> : null}
      <div ref={blockRef}>
        {renderBlock ? (
          <RenderBlock
            renderBlock={renderBlock}
            editorElementRef={blockRef}
            focused={focused}
            level={textBlock.level}
            listItem={textBlock.listItem}
            path={[{_key: textBlock._key}]}
            selected={selected}
            schemaType={schemaType}
            style={textBlock.style}
            value={textBlock}
          >
            {children}
          </RenderBlock>
        ) : (
          children
        )}
      </div>
      {dropPosition === 'end' ? <DropIndicator /> : null}
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
