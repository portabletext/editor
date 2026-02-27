import {
  buildMarksTree,
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextToolkitList,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  nestLists,
  spanToPlainText,
} from '@portabletext/toolkit'
import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  ToolkitNestedPortableTextSpan,
  ToolkitTextNode,
} from '@portabletext/toolkit'
import type {
  PortableTextHtmlComponents,
  PortableTextToHtmlOptions,
} from '../types'
import {defaultComponents} from './renderers/style'
import {defaultMarkRenderers} from './renderers/marks'
import {defaultListRenderers} from './renderers/list'
import {defaultListItemRenderer} from './renderers/list-item'
import {DefaultHardBreakRenderer} from './renderers/hard-break'
import {escapeHtml} from './escape'
import {mergeComponents} from './merge-components'

/**
 * Convert Portable Text blocks to an HTML string.
 *
 * @param value - A single block or array of Portable Text blocks
 * @param options - Rendering options with custom components
 * @returns HTML string
 */
export function portableTextToHtml(
  value: PortableTextBlock | ArbitraryTypedObject | (PortableTextBlock | ArbitraryTypedObject)[],
  options: PortableTextToHtmlOptions = {},
): string {
  const blocks = Array.isArray(value) ? value : [value]
  const components = mergeComponents(options)

  const nested = nestLists(blocks, 'html')

  return nested
    .map((node) => renderNode(node, components, false))
    .join('')
}

function renderNode(
  node: PortableTextBlock | ArbitraryTypedObject,
  components: PortableTextHtmlComponents,
  isInline: boolean,
): string {
  if (isPortableTextToolkitList(node)) {
    return renderList(node, components)
  }

  if (isPortableTextListItemBlock(node)) {
    return renderListItem(node, components)
  }

  if (isPortableTextBlock(node)) {
    return renderBlock(node, components)
  }

  return renderCustomType(node, components, isInline)
}

function renderList(
  node: ReturnType<typeof nestLists>[number] & {_type: '@list'},
  components: PortableTextHtmlComponents,
): string {
  const listItem = (node as {listItem?: string}).listItem || 'bullet'
  const children = (node as {children?: unknown[]}).children || []
  const renderedChildren = children
    .map((child) => renderNode(child as PortableTextBlock, components, false))
    .join('')

  const renderer =
    typeof components.list === 'function'
      ? components.list
      : components.list[listItem] || components.unknownList

  return renderer({children: renderedChildren, value: node as never})
}

function renderListItem(
  node: PortableTextBlock,
  components: PortableTextHtmlComponents,
): string {
  const tree = buildMarksTree(node)
  const children = tree
    .map((child) => renderSpanNode(child, components))
    .join('')

  // Check for nested lists in the block's children
  const nestedLists = ((node as {children?: unknown[]}).children || [])
    .filter((child) => isPortableTextToolkitList(child as {_type: string}))
    .map((child) => renderList(child as never, components))
    .join('')

  const listItemType = node.listItem || 'bullet'
  const renderer =
    typeof components.listItem === 'function'
      ? components.listItem
      : components.listItem[listItemType] || components.unknownListItem

  // Wrap children in block style renderer
  const style = node.style || 'normal'
  const blockRenderer =
    typeof components.block === 'function'
      ? components.block
      : components.block[style] || components.unknownBlockStyle

  const blockContent = blockRenderer({children, value: node})

  return renderer({children: blockContent + nestedLists, value: node})
}

function renderBlock(
  node: PortableTextBlock,
  components: PortableTextHtmlComponents,
): string {
  const tree = buildMarksTree(node)
  const children = tree
    .map((child) => renderSpanNode(child, components))
    .join('')

  const style = node.style || 'normal'
  const renderer =
    typeof components.block === 'function'
      ? components.block
      : components.block[style] || components.unknownBlockStyle

  return renderer({children, value: node})
}

function renderSpanNode(
  node: ToolkitNestedPortableTextSpan | ToolkitTextNode | ArbitraryTypedObject,
  components: PortableTextHtmlComponents,
): string {
  if (isPortableTextToolkitTextNode(node)) {
    if (node.text === '\n') {
      return components.hardBreak === false ? '\n' : components.hardBreak()
    }
    return escapeHtml(node.text)
  }

  if (isPortableTextToolkitSpan(node)) {
    const children = (node.children || [])
      .map((child: ToolkitNestedPortableTextSpan | ToolkitTextNode | ArbitraryTypedObject) =>
        renderSpanNode(child, components),
      )
      .join('')

    const text = spanToPlainText(node)
    const markType = node.markType || ''
    const renderer = components.marks[markType] || components.unknownMark

    return renderer({
      children,
      text,
      markType,
      markKey: node.markKey,
      value: node.markDef,
    })
  }

  // Inline custom type
  return renderCustomType(node, components, true)
}

function renderCustomType(
  node: ArbitraryTypedObject,
  components: PortableTextHtmlComponents,
  isInline: boolean,
): string {
  const renderer = components.types[node._type] || components.unknownType
  return renderer({value: node, isInline})
}
