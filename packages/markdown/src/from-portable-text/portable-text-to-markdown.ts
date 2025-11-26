import {
  buildMarksTree,
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextToolkitList,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  nestLists,
  spanToPlainText,
  type ToolkitNestedPortableTextSpan,
  type ToolkitPortableTextList,
  type ToolkitTextNode,
} from '@portabletext/toolkit'
import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
  TypedObject,
} from '@portabletext/types'
import {defaultComponents} from './components/defaults'
import {mergeComponents} from './components/merge'
import {htmlDecode} from './escape'
import type {
  HtmlPortableTextList,
  MissingComponentHandler,
  NodeRenderer,
  PortableTextHtmlComponents,
  PortableTextOptions,
  Serializable,
  SerializedBlock,
} from './types'
import {
  printWarning,
  unknownBlockStyleWarning,
  unknownListItemStyleWarning,
  unknownListStyleWarning,
  unknownMarkWarning,
  unknownTypeWarning,
} from './warnings'

/**
 * @public
 */
export function portableTextToMarkdown<
  B extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
>(value: B | B[], options: PortableTextOptions = {}): string {
  const {
    components: componentOverrides,
    onMissingComponent: missingComponentHandler = printWarning,
  } = options

  const handleMissingComponent = missingComponentHandler || noop
  const blocks = Array.isArray(value) ? value : [value]
  const nested = nestLists(blocks, 'html')
  const components = componentOverrides
    ? mergeComponents(defaultComponents, componentOverrides)
    : defaultComponents

  const renderNode = getNodeRenderer(components, handleMissingComponent)
  const rendered = nested.map((node, index) =>
    renderNode({node: node, index, isInline: false, renderNode}),
  )

  // Join top-level elements, adding spacing between blocks
  return rendered
    .map((item, index) => {
      // Skip empty items
      if (!item) return item

      // Add spacing between blocks (but not after the last one)
      if (index < rendered.length - 1) {
        const currentNode = nested[index]

        // Lists need a single newline after them
        if (currentNode && isPortableTextToolkitList(currentNode)) {
          return `${item}\n`
        }

        // Blocks need double newlines between them (unless next is empty)
        if (currentNode && isPortableTextBlock(currentNode)) {
          // Check if next item will be empty
          const nextItem = rendered[index + 1]
          if (nextItem && nextItem.trim() !== '') {
            return `${item}\n\n`
          }
        }
      }
      return item
    })
    .join('')
}

const getNodeRenderer = (
  components: PortableTextHtmlComponents,
  handleMissingComponent: MissingComponentHandler,
): NodeRenderer => {
  function renderNode<N extends TypedObject>(options: Serializable<N>): string {
    const {node, index, isInline} = options

    if (isPortableTextToolkitList(node)) {
      return renderList(node, index)
    }

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
    parentLevel?: number,
  ): string {
    const renderer = components.listItem
    const handler =
      typeof renderer === 'function' ? renderer : renderer[node.listItem]
    const itemHandler = handler || components.unknownListItem

    if (itemHandler === components.unknownListItem) {
      const style = node.listItem || 'bullet'
      handleMissingComponent(unknownListItemStyleWarning(style), {
        type: style,
        nodeType: 'listItemStyle',
      })
    }

    // Only adjust level if there's a skip in nesting (e.g., level 1 -> level 3)
    // If consecutive (level 1 -> level 2), use absolute level for natural nesting
    const adjustedNode =
      parentLevel !== undefined &&
      node.level !== undefined &&
      node.level > parentLevel + 1
        ? {...node, level: parentLevel + 1}
        : node

    // Build the text content from the block
    const tree = buildMarksTree(adjustedNode)
    const textContent = tree
      .map((child, i) => {
        // Skip nested list nodes - they'll be handled separately
        if (isPortableTextToolkitList(child)) {
          return ''
        }
        return renderNode({node: child, isInline: true, index: i, renderNode})
      })
      .join('')

    // Handle nested lists that appear as children of this list item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nestedLists = (node.children as any[])
      .filter((child) => isPortableTextToolkitList(child))
      .map((child: ToolkitPortableTextList, i: number) => {
        const rendered = renderList(child, i, node.level)
        // If parent item is numbered, add extra space to each line of nested content
        if (node.listItem === 'number') {
          return rendered
            .split('\n')
            .map((line, idx, arr) => {
              // Don't add space to empty lines or the last line (which is typically empty)
              if (line === '' || (idx === arr.length - 1 && line === ''))
                return line
              return ` ${line}`
            })
            .join('\n')
        }
        return rendered
      })
      .join('')

    // Add newline between parent item text and nested list
    let children = textContent + (nestedLists ? `\n${nestedLists}` : '')

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
      value: adjustedNode,
      index,
      isInline: false,
      renderNode,
      children,
    })
  }

  function renderList(
    node: HtmlPortableTextList,
    index: number,
    parentLevel?: number,
  ): string {
    const children = node.children
      .filter((child): child is PortableTextListItemBlock =>
        isPortableTextListItemBlock(child),
      )
      .map((child, childIndex) =>
        renderListItem(
          child._key ? child : {...child, _key: `li-${index}-${childIndex}`},
          childIndex,
          parentLevel,
        ),
      )

    const component = components.list
    const handler =
      typeof component === 'function' ? component : component[node.listItem]
    const list = handler || components.unknownList

    if (list === components.unknownList) {
      const style = node.listItem || 'bullet'
      handleMissingComponent(unknownListStyleWarning(style), {
        nodeType: 'listStyle',
        type: style,
      })
    }

    // Join children - they already have newlines, so just concatenate
    return list({
      value: node,
      index,
      isInline: false,
      renderNode,
      children: children.join(''),
    })
  }

  function renderSpan(node: ToolkitNestedPortableTextSpan): string {
    const {markDef, markType, markKey} = node
    const span = components.marks[markType] || components.unknownMark
    const children = node.children.map((child, childIndex) =>
      renderNode({node: child, index: childIndex, isInline: true, renderNode}),
    )

    if (span === components.unknownMark) {
      handleMissingComponent(unknownMarkWarning(markType), {
        nodeType: 'mark',
        type: markType,
      })
    }

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {_key, ...props} = serializeBlock({node, index, isInline, renderNode})
    const style = props.node.style || 'normal'
    const handler =
      typeof components.block === 'function'
        ? components.block
        : components.block[style]
    const block = handler || components.unknownBlockStyle

    if (block === components.unknownBlockStyle) {
      handleMissingComponent(unknownBlockStyleWarning(style), {
        nodeType: 'blockStyle',
        type: style,
      })
    }

    return block({...props, value: props.node, renderNode})
  }

  function renderText(node: ToolkitTextNode): string {
    if (node.text === '\n') {
      const hardBreak = components.hardBreak
      return hardBreak ? hardBreak() : '\n'
    }

    // Normalize Unicode quotes to straight quotes for consistency
    let text = htmlDecode(node.text)
    text = text.replace(/[\u2018\u2019]/g, "'") // ' and ' to '
    text = text.replace(/[\u201C\u201D]/g, '"') // " and " to "
    return text
  }

  function renderCustomBlock(
    value: TypedObject,
    index: number,
    isInline: boolean,
  ): string {
    const node = components.types[value._type]

    if (!node) {
      handleMissingComponent(unknownTypeWarning(value._type), {
        nodeType: 'block',
        type: value._type,
      })
    }

    const component = node || components.unknownType
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

  // Render all spans first
  const renderedSpans = tree.map((child, i) =>
    renderNode({node: child, isInline: true, index: i, renderNode}),
  )

  // Join spans directly without adding spaces - marks should be adjacent
  let renderedContent = renderedSpans.join('')

  // Post-process: when we have two consecutive hardbreaks, the second should be a plain newline
  // This handles the case where \n\n in source becomes hardbreak + hardbreak but should be hardbreak + newline
  const hardBreak = options.renderNode({
    node: {_type: '@text', text: '\n'} as ToolkitTextNode,
    isInline: true,
    index: 0,
    renderNode,
  })

  // Replace consecutive hardbreaks with hardbreak + newline
  if (hardBreak && hardBreak !== '\n') {
    const doubleHardbreak = `${hardBreak}${hardBreak}`
    const hardbreakNewline = `${hardBreak}\n`
    while (renderedContent.includes(doubleHardbreak)) {
      renderedContent = renderedContent.replace(
        doubleHardbreak,
        hardbreakNewline,
      )
    }
  }

  return {
    _key: node._key || `block-${index}`,
    children: renderedContent,
    index,
    isInline,
    node,
  }
}

function noop() {
  // Intentional noop
}
