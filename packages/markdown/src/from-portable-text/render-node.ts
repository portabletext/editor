import {
  buildMarksTree,
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  spanToPlainText,
  toPlainText,
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
import {serializeDegradationMessage} from './degradation-messages'
import {
  truncateSnippet,
  type SerializeDegradationLoss,
  type SerializeDegradationType,
} from './degradation-report'
import {planLeafEscaping} from './escape-plain-text'
import {
  consumeListItemFirstBlock,
  markListItemFirstBlock,
} from './list-item-first-block'
import {DefaultUnknownListItemRenderer} from './renderers/list-item'
import {DefaultUnknownMarkRenderer} from './renderers/marks'
import {
  DefaultH1Renderer,
  DefaultH2Renderer,
  DefaultH3Renderer,
  DefaultH4Renderer,
  DefaultH5Renderer,
  DefaultH6Renderer,
  DefaultUnknownStyleRenderer,
} from './renderers/style'
import type {
  PortableTextBlockRenderer,
  PortableTextRenderers,
  RenderNode,
  Serializable,
} from './types'

type ReportDegradation = (
  entry: SerializeDegradationLoss & {
    message: string
    snippet: string | undefined
    node: object
    owner: object
  },
) => void

/**
 * ATX headings are single-line, inline-only leaf blocks: an ATX heading's
 * first line sits inside its `# ` prefix and can never be reparsed as a
 * block construct, so line-leading hazards never apply there. A hard
 * break's later lines are ordinary markdown lines outside that prefix and
 * get the full line-start battery, same as any other block's continuation.
 */
const HEADING_STYLES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const DEFAULT_HEADING_RENDERERS = new Set([
  DefaultH1Renderer,
  DefaultH2Renderer,
  DefaultH3Renderer,
  DefaultH4Renderer,
  DefaultH5Renderer,
  DefaultH6Renderer,
])

const SETEXT_UNDERLINES = new Map([
  [DefaultH1Renderer, '==='],
  [DefaultH2Renderer, '---'],
])

export const createRenderNode = (
  renderers: PortableTextRenderers,
  listIndexMap: Map<string, number>,
  listDepthMap: Map<string, number>,
  options: {
    reportDegradation?: ReportDegradation
    /**
     * Renders an `h1` or `h2` whose rendered text holds a line break as a
     * setext heading instead of a paragraph.
     */
    candidateForms?: boolean
    /**
     * Called with each block written as a paragraph because its rendered
     * text holds a line break, and whether a setext heading could express
     * it instead.
     */
    onLineBreakFallback?: (node: TypedObject, setextCandidate: boolean) => void
  },
): RenderNode => {
  const {candidateForms = false} = options

  // A heading that falls back to a paragraph may render its children twice,
  // and a pure renderer can visit different content in each render, since
  // its `children` differ. While a render is being collected, its reports
  // and fallbacks are buffered here, so only those of the render that is
  // written out take effect.
  let collectedEffects: Array<() => void> | undefined
  const emit = (effect: () => void) => {
    if (collectedEffects) {
      collectedEffects.push(effect)
    } else {
      effect()
    }
  }
  const collectEffects = <T>(render: () => T) => {
    const enclosingEffects = collectedEffects
    const effects: Array<() => void> = []
    collectedEffects = effects
    try {
      return {result: render(), effects}
    } finally {
      collectedEffects = enclosingEffects
    }
  }
  const report = options.reportDegradation
  const reportDegradation: ReportDegradation | undefined = report
    ? (entry) => emit(() => report(entry))
    : undefined
  const fallback = options.onLineBreakFallback
  const onLineBreakFallback = fallback
    ? (node: TypedObject, setextCandidate: boolean) =>
        emit(() => fallback(node, setextCandidate))
    : undefined
  // Keyed by the actual `@text` node objects `buildMarksTree` produces, not
  // by render order: a custom type/mark renderer can call `renderNode` with
  // a synthetic node of its own mid-block (eg to render a placeholder), and
  // that call must not shift which escaped string a later real leaf gets.
  // A synthetic node was never planned, so it's absent from the map and
  // renders its own raw text.
  const escapedTextByNode = new WeakMap<ToolkitTextNode, string>()

  // A `'  \n'` break right after an empty line leaves a whitespace-only
  // line, which Markdown reads as a blank line ending the paragraph. A
  // backslash break keeps the line non-blank.
  const backslashBreakNodes = new WeakSet<ToolkitTextNode>()

  // `renderListItem` renders a styled item through a copy of the block
  // (with `listItem` stripped, to avoid recursing back into itself), so a
  // degradation reported on that copy could not be re-found in the input
  // tree by reference. The alias maps the copy back to the input node.
  const reportedNodeAliases = new WeakMap<TypedObject, TypedObject>()

  // List items whose heading style fell back to `normal`, so the list-item
  // renderer gets the item as it would if stored with that style.
  const normalStyleListItems = new WeakSet<TypedObject>()

  // Computed once per document render: a custom `hardBreak` can render to
  // something with no newline of its own (eg `() => '<br />'`), in which
  // case a `\n` inside a span's text is not a real line boundary in the
  // rendered output, and `planLeafEscaping` needs to know that up front.
  const hardBreakOutputHasNewline = renderers.hardBreak().includes('\n')

  // The text block whose children are being rendered, so a mark
  // degradation can name the block that held the span: a marks-tree
  // `@span` wrapper keeps only the span's `_key`, which sibling table
  // cells may reuse.
  let currentTextBlock: TypedObject | undefined

  // Shared by `renderBlock` and `renderListItem`, whatever the block's
  // style: both flatten `node.children` into the same text/mark tree and
  // need it escaped and keyed before rendering it.
  function renderBlockChildren(
    node: PortableTextBlock | PortableTextListItemBlock,
    isHeading: boolean,
    isListItem = false,
  ): string {
    return renderPlannedChildren(
      node,
      planChildren(node, isHeading, isListItem),
    )
  }

  function planChildren(
    node: PortableTextBlock | PortableTextListItemBlock,
    isHeading: boolean,
    isListItem: boolean,
  ): Array<string> {
    return planLeafEscaping(node.children ?? [], node.markDefs ?? [], {
      isHeading,
      isListItem,
      hardBreakOutputHasNewline,
    })
  }

  function renderPlannedChildren(
    node: PortableTextBlock | PortableTextListItemBlock,
    chunks: ReadonlyArray<string>,
  ): string {
    const tree = buildMarksTree(node)
    assignEscapedText(tree, chunks)

    const enclosingTextBlock = currentTextBlock
    currentTextBlock = reportedNodeAliases.get(node) ?? node
    const rendered = tree
      .map((child, i) =>
        renderNode({node: child, isInline: true, index: i, renderNode}),
      )
      .join('')
    currentTextBlock = enclosingTextBlock
    return rendered
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
    let isFirstLine = true
    let lineIsEmpty = true

    const visit = (
      node: ToolkitNestedPortableTextSpan | ToolkitTextNode | TypedObject,
    ) => {
      if (isPortableTextToolkitTextNode(node)) {
        if (node.text === '\n') {
          if (candidateForms && lineIsEmpty && !isFirstLine) {
            backslashBreakNodes.add(node)
          }
          isFirstLine = false
          lineIsEmpty = true
          return
        }
        const escaped = chunks[pointer]
        if (escaped !== undefined) {
          escapedTextByNode.set(node, escaped)
        }
        pointer++
        if (node.text !== '') {
          lineIsEmpty = false
        }
        return
      }

      if (isPortableTextToolkitSpan(node)) {
        node.children.forEach(visit)
        return
      }

      lineIsEmpty = false
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

    if (
      !handler &&
      renderers.unknownListItem === DefaultUnknownListItemRenderer
    ) {
      reportDegradation?.({
        type: 'list-item-fallback',
        listItem: node.listItem,
        message: serializeDegradationMessage['list-item-fallback'](
          node.listItem,
        ),
        snippet: truncateSnippet(toPlainText(node)),
        node,
        owner: node,
      })
    }

    let children: string

    if (node.style && node.style !== 'normal') {
      // Wrap any other style in whatever the block component says to use.
      // `renderNode` would recurse straight back into `renderListItem` if
      // `blockNode` still carried `listItem`, so it's stripped from the
      // copy; `markListItemFirstBlock` restores the list-item context
      // (line-start hazard escaping, the GFM checkbox prefix) onto that
      // same copy so `renderBlock` picks it up via `consumeListItemFirstBlock`.
      const {listItem: _listItem, ...blockNode} = node
      reportedNodeAliases.set(blockNode, node)
      markListItemFirstBlock(blockNode)
      children = renderNode({
        node: blockNode,
        index,
        isInline: false,
        renderNode,
      })
      if (!normalStyleListItems.has(node)) {
        // Strip trailing newlines from block styles - list item component handles spacing
        children = children.replace(/\n+$/, '')
      }
    } else {
      children = renderBlockChildren(node, false, true)
    }

    return itemHandler({
      value: normalStyleListItems.has(node) ? {...node, style: 'normal'} : node,
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
    const resolvedMark = renderers.marks[markType]
    const span = resolvedMark || renderers.unknownMark

    if (!resolvedMark && renderers.unknownMark === DefaultUnknownMarkRenderer) {
      const type: SerializeDegradationType = markDef
        ? 'annotation-dropped'
        : 'decorator-dropped'
      reportDegradation?.({
        ...(markDef
          ? {type: 'annotation-dropped', markDefinition: markDef}
          : {type: 'decorator-dropped', decorator: markType}),
        message: serializeDegradationMessage[type](markType),
        snippet: truncateSnippet(spanToPlainText(node)),
        node,
        owner: currentTextBlock ?? node,
      })
    }

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
    const handler =
      typeof renderers.block === 'function'
        ? renderers.block
        : renderers.block[style]

    if (
      typeof renderers.block !== 'function' &&
      handler !== undefined &&
      DEFAULT_HEADING_RENDERERS.has(handler)
    ) {
      return renderDefaultHeading(node, index, isInline, isListItem, {
        heading: handler,
        normal: renderers.block['normal'],
      })
    }

    const children = renderBlockChildren(
      node,
      HEADING_STYLES.has(style),
      isListItem,
    )
    return renderStyledBlock(node, style, handler, {
      index,
      isInline,
      children,
      value: node,
      renderNode,
    })
  }

  function renderStyledBlock(
    node: PortableTextBlock,
    style: string,
    handler: PortableTextBlockRenderer | undefined,
    props: Parameters<PortableTextBlockRenderer>[0],
  ): string {
    if (
      !handler &&
      renderers.unknownBlockStyle === DefaultUnknownStyleRenderer
    ) {
      reportDegradation?.({
        type: 'style-fallback',
        style,
        message: serializeDegradationMessage['style-fallback'](
          style,
          'no-renderer',
        ),
        snippet: truncateSnippet(toPlainText(node)),
        node: reportedNodeAliases.get(node) ?? node,
        owner: reportedNodeAliases.get(node) ?? node,
      })
    }

    return (handler || renderers.unknownBlockStyle)(props)
  }

  // Markdown has no multi-line ATX heading: the line after a break reads
  // back as a paragraph of its own. Only the rendered children tell
  // whether there is one, since a mark renderer, a link title or image
  // text can add a line break and a custom `hardBreak` can render without
  // one.
  //
  // A heading that falls back must write exactly the output and the
  // reports the same block stored with style `normal` would, followed by
  // its own `style-fallback`.
  function renderDefaultHeading(
    node: PortableTextBlock,
    index: number,
    isInline: boolean,
    isListItem: boolean,
    handlers: {
      heading: PortableTextBlockRenderer
      normal: PortableTextBlockRenderer | undefined
    },
  ): string {
    const headingChunks = planChildren(node, true, isListItem)
    const heading = collectEffects(() =>
      renderPlannedChildren(node, headingChunks),
    )
    if (!/[\r\n]/.test(heading.result)) {
      heading.effects.forEach(emit)
      return handlers.heading({
        index,
        isInline,
        children: heading.result,
        value: node,
        renderNode,
      })
    }

    // A paragraph's or setext heading's lines are ordinary paragraph lines,
    // so every line, the first included, gets the full line-start
    // escaping. Most text escapes the same either way, and then the
    // heading rendering is reused instead of running the mark renderers
    // again.
    const paragraphChunks = planChildren(node, false, isListItem)
    const paragraph = paragraphChunks.some(
      (chunk, index) => chunk !== headingChunks[index],
    )
      ? collectEffects(() => renderPlannedChildren(node, paragraphChunks))
      : heading
    paragraph.effects.forEach(emit)
    const children = paragraph.result

    const setextUnderline =
      !isInline && !isListItem
        ? SETEXT_UNDERLINES.get(handlers.heading)
        : undefined
    if (candidateForms && setextUnderline !== undefined) {
      return `${children}\n${setextUnderline}`
    }

    const reportedNode = reportedNodeAliases.get(node)
    let rendered = children
    if (reportedNode !== undefined) {
      // `node` is `renderListItem`'s copy of a list item, and a `normal`
      // list item's children go to the list-item renderer as they are.
      normalStyleListItems.add(reportedNode)
    } else {
      rendered = renderStyledBlock(node, 'normal', handlers.normal, {
        index,
        isInline,
        children,
        value: {...node, style: 'normal'},
        renderNode,
      })
    }

    const style = node.style || 'normal'
    onLineBreakFallback?.(reportedNode ?? node, setextUnderline !== undefined)
    reportDegradation?.({
      type: 'style-fallback',
      style,
      message: serializeDegradationMessage['style-fallback'](
        style,
        'line-break',
      ),
      snippet: truncateSnippet(toPlainText(node)),
      node: reportedNode ?? node,
      owner: reportedNode ?? node,
    })
    return rendered
  }

  function renderText(node: ToolkitTextNode): string {
    if (node.text === '\n') {
      return backslashBreakNodes.has(node) ? '\\\n' : renderers.hardBreak()
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
