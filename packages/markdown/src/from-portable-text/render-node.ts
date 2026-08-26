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
import {planLeafEscaping} from './escape-plain-text'
import {
  consumeListItemFirstBlock,
  markListItemFirstBlock,
} from './list-item-first-block'
import type {PortableTextRenderers, RenderNode, Serializable} from './types'

/**
 * ATX headings are single-line, inline-only leaf blocks: an ATX heading's
 * first line sits inside its `# ` prefix and can never be reparsed as a
 * block construct, so line-leading hazards never apply there. A hard
 * break's later lines are ordinary markdown lines outside that prefix and
 * get the full line-start battery, same as any other block's continuation.
 */
const HEADING_STYLES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export const createRenderNode = (
  renderers: PortableTextRenderers,
  listIndexMap: Map<string, number>,
  listDepthMap: Map<string, number>,
): RenderNode => {
  // Keyed by the actual `@text` node objects `buildMarksTree` produces, not
  // by render order: a custom type/mark renderer can call `renderNode` with
  // a synthetic node of its own mid-block (eg to render a placeholder), and
  // that call must not shift which escaped string a later real leaf gets.
  // A synthetic node was never planned, so it's absent from the map and
  // renders its own raw text.
  const escapedTextByNode = new WeakMap<ToolkitTextNode, string>()

  // Computed once per document render: a custom `hardBreak` can render to
  // something with no newline of its own (eg `() => '<br />'`), in which
  // case a `\n` inside a span's text is not a real line boundary in the
  // rendered output, and `planLeafEscaping` needs to know that up front.
  const hardBreakOutputHasNewline = renderers.hardBreak().includes('\n')

  // Shared by `renderBlock` and `renderListItem`, whatever the block's
  // style: both flatten `node.children` into the same text/mark tree and
  // need it escaped and keyed before rendering it.
  function renderBlockChildren(
    node: PortableTextBlock | PortableTextListItemBlock,
    isHeading: boolean,
    isListItem = false,
  ): string {
    const chunks = planLeafEscaping(node.children ?? [], node.markDefs ?? [], {
      isHeading,
      isListItem,
      hardBreakOutputHasNewline,
    })
    const tree = buildMarksTree(node)
    assignEscapedText(tree, chunks)

    return tree
      .map((child, i) =>
        renderNode({node: child, isInline: true, index: i, renderNode}),
      )
      .join('')
  }

  // Walks the tree in the same left-to-right, opaque-object-skipping order
  // `planLeafEscaping` used to produce `chunks`, so each `@text` leaf gets
  // keyed to the chunk planned for it.
  function assignEscapedText(
    nodes: ReadonlyArray<
      ToolkitNestedPortableTextSpan | ToolkitTextNode | TypedObject
    >,
    chunks: ReadonlyArray<string>,
  ): void {
    let pointer = 0

    const visit = (
      node: ToolkitNestedPortableTextSpan | ToolkitTextNode | TypedObject,
    ) => {
      if (isPortableTextToolkitTextNode(node)) {
        if (node.text !== '\n') {
          const escaped = chunks[pointer]
          if (escaped !== undefined) {
            escapedTextByNode.set(node, escaped)
          }
          pointer++
        }
        return
      }

      if (isPortableTextToolkitSpan(node)) {
        node.children.forEach(visit)
      }
    }

    nodes.forEach(visit)
  }

  function renderNode<N extends TypedObject>(options: Serializable<N>): string {
    const {node, index, isInline} = options

    if (isPortableTextListItemBlock(node)) {
      return renderListItem(node, index)
    }

    if (isPortableTextToolkitSpan(node)) {
      return renderSpan(node)
    }

    if (isPortableTextBlock(node)) {
      return renderBlock(node, index, isInline, consumeListItemFirstBlock(node))
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

    let children: string

    if (node.style && node.style !== 'normal') {
      // Wrap any other style in whatever the block component says to use.
      // `renderNode` would recurse straight back into `renderListItem` if
      // `blockNode` still carried `listItem`, so it's stripped from the
      // copy; `markListItemFirstBlock` restores the list-item context
      // (line-start hazard escaping, the GFM checkbox prefix) onto that
      // same copy so `renderBlock` picks it up via `consumeListItemFirstBlock`.
      const {listItem: _listItem, ...blockNode} = node
      markListItemFirstBlock(blockNode)
      children = renderNode({
        node: blockNode,
        index,
        isInline: false,
        renderNode,
      })
      // Strip trailing newlines from block styles - list item component handles spacing
      children = children.replace(/\n+$/, '')
    } else {
      children = renderBlockChildren(node, false, true)
    }

    return itemHandler({
      value: node,
      index,
      listIndex: node._key ? listIndexMap.get(node._key) : undefined,
      listDepth: node._key ? listDepthMap.get(node._key) : undefined,
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
    isListItem: boolean,
  ): string {
    const style = node.style || 'normal'
    const children = renderBlockChildren(
      node,
      HEADING_STYLES.has(style),
      isListItem,
    )
    const handler =
      typeof renderers.block === 'function'
        ? renderers.block
        : renderers.block[style]
    const block = handler || renderers.unknownBlockStyle

    return block({index, isInline, children, value: node, renderNode})
  }

  function renderText(node: ToolkitTextNode): string {
    if (node.text === '\n') {
      return renderers.hardBreak()
    }

    return escapedTextByNode.get(node) ?? node.text
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
