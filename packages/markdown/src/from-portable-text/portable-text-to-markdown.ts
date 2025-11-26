import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  TypedObject,
} from '@portabletext/types'
import {buildListIndexMap} from './build-list-index-map'
import {createRenderNode} from './render-node'
import {
  DefaultBlockSpacingRenderer,
  type BlockSpacingRenderer,
} from './renderers/block-spacing'
import {DefaultHardBreakRenderer} from './renderers/hard-break'
import {
  DefaultListItemRenderer,
  DefaultUnknownListItemRenderer,
} from './renderers/list-item'
import {
  DefaultCodeRenderer,
  DefaultEmRenderer,
  DefaultLinkRenderer,
  DefaultStrikeThroughRenderer,
  DefaultStrongRenderer,
  DefaultUnderlineRenderer,
  DefaultUnknownMarkRenderer,
} from './renderers/marks'
import {
  DefaultBlockquoteRenderer,
  DefaultH1Renderer,
  DefaultH2Renderer,
  DefaultH3Renderer,
  DefaultH4Renderer,
  DefaultH5Renderer,
  DefaultH6Renderer,
  DefaultNormalRenderer,
  DefaultUnknownStyleRenderer,
} from './renderers/style'
import {DefaultUnknownTypeRenderer} from './renderers/type'
import type {PortableTextRenderers} from './types'

const defaultRenderers: PortableTextRenderers = {
  types: {},

  block: {
    normal: DefaultNormalRenderer,
    blockquote: DefaultBlockquoteRenderer,
    h1: DefaultH1Renderer,
    h2: DefaultH2Renderer,
    h3: DefaultH3Renderer,
    h4: DefaultH4Renderer,
    h5: DefaultH5Renderer,
    h6: DefaultH6Renderer,
  },
  marks: {
    'em': DefaultEmRenderer,
    'strong': DefaultStrongRenderer,
    'code': DefaultCodeRenderer,
    'underline': DefaultUnderlineRenderer,
    'strike-through': DefaultStrikeThroughRenderer,
    'link': DefaultLinkRenderer,
  },
  listItem: DefaultListItemRenderer,
  hardBreak: DefaultHardBreakRenderer,

  unknownType: DefaultUnknownTypeRenderer,
  unknownMark: DefaultUnknownMarkRenderer,
  unknownListItem: DefaultUnknownListItemRenderer,
  unknownBlockStyle: DefaultUnknownStyleRenderer,
}

type Options = Partial<PortableTextRenderers> & {
  blockSpacing?: BlockSpacingRenderer
}

/**
 * @public
 */
export function portableTextToMarkdown<
  Block extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
>(blocks: Array<Block>, options: Options = {}): string {
  const renderers = {
    block: {
      ...defaultRenderers.block,
      ...options.block,
    },
    listItem: options.listItem ?? defaultRenderers.listItem,
    marks: {
      ...defaultRenderers.marks,
      ...options.marks,
    },
    types: {
      ...defaultRenderers.types,
      ...options.types,
    },
    hardBreak: options.hardBreak ?? defaultRenderers.hardBreak,
    unknownType: options.unknownType ?? defaultRenderers.unknownType,
    unknownBlockStyle:
      options.unknownBlockStyle ?? defaultRenderers.unknownBlockStyle,
    unknownListItem:
      options.unknownListItem ?? defaultRenderers.unknownListItem,
    unknownMark: options.unknownMark ?? defaultRenderers.unknownMark,
  }
  const renderBlockSpacing = options.blockSpacing ?? DefaultBlockSpacingRenderer

  const listIndexMap = buildListIndexMap(blocks)
  const renderNode = createRenderNode(renderers, listIndexMap)

  return blocks
    .map((node, index) => {
      const renderedNode = renderNode({
        node,
        index,
        isInline: false,
        renderNode,
      })

      if (index === blocks.length - 1) {
        return renderedNode
      }

      const nextNode = blocks.at(index + 1)

      if (!nextNode) {
        return renderedNode
      }

      const blockSpacing =
        renderBlockSpacing({
          current: node,
          next: nextNode,
        }) ?? '\n\n'

      return `${renderedNode}${blockSpacing}`
    })
    .join('')
}
