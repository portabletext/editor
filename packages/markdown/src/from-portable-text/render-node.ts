import {
  buildMarksTree,
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  spanToPlainText,
  type ToolkitNestedPortableTextSpan,
  type ToolkitTextNode,
} from '@portabletext/toolkit'
import type {
  PortableTextBlock,
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
  TypedObject,
} from '@portabletext/types'
import {defaultKeyGenerator} from '../key-generator'
import type {PortableTextRenderers, RenderNode, Serializable} from './types'

interface SerializedBlock {
  _key: string
  children: string
  index: number
  isInline: boolean
  node: PortableTextBlock | PortableTextListItemBlock
}

export const createRenderNode = (
  renderers: PortableTextRenderers,
  listIndexMap: Map<string, number>,
): RenderNode => {
  function renderNode<N extends TypedObject>(options: Serializable<N>): string {
    const {node, index, isInline} = options

    if (isPortableTextListItemBlock(node)) {
      return renderListItem(node, index)
    }

    if (isPortableTextToolkitSpan(node)) {
      return renderSpan(node)
    }

    if (isPortableTextBlock(node)) {
      return renderBlock(node, index, isInline)
    }

    if (isPortableTextToolkitTextNode(node)) {
      return renderText(node)
    }

    return renderCustomBlock(node, index, isInline)
  }

  function renderListItem(
    node: PortableTextListItemBlock<
      PortableTextMarkDefinition,
      PortableTextSpan
    >,
    index: number,
  ): string {
    const renderer = renderers.listItem
    const handler =
      typeof renderer === 'function' ? renderer : renderer[node.listItem]
    const itemHandler = handler || renderers.unknownListItem

    // Build the text content from the block
    const tree = buildMarksTree(node)
    const textContent = tree
      .map((child, i) => {
        return renderNode({node: child, isInline: true, index: i, renderNode})
      })
      .join('')

    let children = textContent

    if (node.style && node.style !== 'normal') {
      // Wrap any other style in whatever the block component says to use
      const {listItem: _listItem, ...blockNode} = node
      children = renderNode({
        node: blockNode,
        index,
        isInline: false,
        renderNode,
      })
      // Strip trailing newlines from block styles - list item component handles spacing
      children = children.replace(/\n+$/, '')
    }

    return itemHandler({
      value: node,
      index,
      listIndex: node._key ? listIndexMap.get(node._key) : undefined,
      isInline: false,
      renderNode,
      children,
    })
  }

  function renderSpan(node: ToolkitNestedPortableTextSpan): string {
    const {markDef, markType, markKey} = node
    const span = renderers.marks[markType] || renderers.unknownMark
    const children = node.children.map((child, childIndex) =>
      renderNode({node: child, index: childIndex, isInline: true, renderNode}),
    )

    return span({
      text: spanToPlainText(node),
      value: markDef,
      markType,
      markKey,
      renderNode,
      children: children.join(''),
    })
  }

  function renderBlock(
    node: PortableTextBlock,
    index: number,
    isInline: boolean,
  ): string {
    const {_key, ...props} = serializeBlock({node, index, isInline, renderNode})
    const style = props.node.style || 'normal'
    const handler =
      typeof renderers.block === 'function'
        ? renderers.block
        : renderers.block[style]
    const block = handler || renderers.unknownBlockStyle

    return block({...props, value: props.node, renderNode})
  }

  function renderText(node: ToolkitTextNode): string {
    if (node.text === '\n') {
      return renderers.hardBreak()
    }

    return node.text
  }

  function renderCustomBlock(
    value: TypedObject,
    index: number,
    isInline: boolean,
  ): string {
    const component = renderers.types[value._type] ?? renderers.unknownType

    return component({
      value,
      isInline,
      index,
      renderNode,
    })
  }

  return renderNode
}

function serializeBlock(
  options: Serializable<PortableTextBlock>,
): SerializedBlock {
  const {node, index, isInline, renderNode} = options
  const tree = buildMarksTree(node)

  const renderedChildren = tree.map((child, i) =>
    renderNode({node: child, isInline: true, index: i, renderNode}),
  )

  return {
    _key: node._key || defaultKeyGenerator(),
    children: renderedChildren.join(''),
    index,
    isInline,
    node,
  }
}
