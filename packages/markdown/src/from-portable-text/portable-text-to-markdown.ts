import type {Schema} from '@portabletext/schema'
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
import {
  DefaultCalloutRenderer,
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultHtmlRenderer,
  DefaultImageRenderer,
  DefaultTableRenderer,
  DefaultUnknownTypeRenderer,
} from './renderers/type'
import type {PortableTextRenderers} from './types'

const defaultRenderers: PortableTextRenderers = {
  types: {
    'callout': DefaultCalloutRenderer,
    'code': DefaultCodeBlockRenderer,
    'horizontal-rule': DefaultHorizontalRuleRenderer,
    'html': DefaultHtmlRenderer,
    'image': DefaultImageRenderer,
    'table': DefaultTableRenderer,
  },

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

  /**
   * Compiled schema that gates the built-in type renderers; it never
   * validates the value. A default renderer runs only when the schema
   * declares its type (`blockObjects` for block position, `inlineObjects`
   * for inline); undeclared types render through `unknownType`, whose
   * default output reparses back to the same value. The gate checks the
   * type name only, so declare the type's fields too:
   * `markdownToPortableText` cannot rebuild a value from a fieldless
   * declaration. Renderers passed in `types` are never gated. Pass the
   * same schema to `markdownToPortableText` to keep the round trip
   * consistent. Omitted, all default renderers stay active.
   */
  schema?: Schema
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
      ...gateDefaultTypeRenderers(
        defaultRenderers.types,
        options.schema,
        options.unknownType ?? defaultRenderers.unknownType,
      ),
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

  const {listIndexMap, listDepthMap} = buildListIndexMap(blocks)
  const renderNode = createRenderNode(renderers, listIndexMap, listDepthMap)

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

function gateDefaultTypeRenderers(
  defaultTypeRenderers: PortableTextRenderers['types'],
  schema: Schema | undefined,
  resolvedUnknownType: PortableTextRenderers['unknownType'],
): PortableTextRenderers['types'] {
  if (!schema) {
    return defaultTypeRenderers
  }

  return Object.fromEntries(
    Object.entries(defaultTypeRenderers).map(([typeName, renderer]) => [
      typeName,
      (rendererOptions: Parameters<typeof resolvedUnknownType>[0]) => {
        const declared = (
          rendererOptions.isInline ? schema.inlineObjects : schema.blockObjects
        ).some((item) => item.name === typeName)

        return declared && renderer
          ? renderer(rendererOptions)
          : resolvedUnknownType(rendererOptions)
      },
    ]),
  )
}
