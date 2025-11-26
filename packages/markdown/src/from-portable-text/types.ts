import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextBlockStyle,
  PortableTextListItemBlock,
  PortableTextListItemType,
  TypedObject,
} from '@portabletext/types'

/**
 * Generic type for portable text renderers that takes blocks/inline blocks
 *
 * @public
 */
export type PortableTextRenderer<N> = (
  options: PortableTextRendererOptions<N>,
) => string

/**
 * Renderer function type for rendering portable text blocks (paragraphs, headings, blockquotes etc)
 *
 * @public
 */
export type PortableTextBlockRenderer = PortableTextRenderer<PortableTextBlock>

/**
 * Renderer function type for rendering portable text list items
 *
 * @public
 */
export type PortableTextListItemRenderer =
  PortableTextRenderer<PortableTextListItemBlock>

/**
 * Renderer function type for rendering portable text marks and/or decorators
 *
 * @public
 */
export type PortableTextMarkRenderer<M extends TypedObject = any> = (
  options: PortableTextMarkRendererOptions<M>,
) => string

/**
 * @public
 */
export type PortableTextTypeRenderer<V extends TypedObject = any> = (
  options: PortableTextTypeRendererOptions<V>,
) => string

/**
 * Object defining the different renderer functions to use for rendering various aspects
 * of Portable Text and user-provided types to Markdown.
 *
 * @public
 */
export interface PortableTextRenderers {
  /**
   * Object of renderer functions for different types of objects that might appear
   * both as part of the blocks array, or as inline objects _inside_ of a block,
   * alongside text spans.
   *
   * Use the `isInline` property to check whether or not this is an inline object or a block.
   *
   * The object has the shape `{typeName: RendererFn}`, where `typeName` is the value set
   * in individual `_type` attributes.
   */
  types: Record<string, PortableTextTypeRenderer | undefined>

  /**
   * Object of renderer functions for different types of marks that might appear in spans.
   *
   * The object has the shape `{markName: RendererFn}`, where `markName` is the value set
   * in individual `_type` attributes, values being stored in the parent blocks `markDefs`.
   */
  marks: Record<string, PortableTextMarkRenderer | undefined>

  /**
   * Object of renderer functions for blocks with different `style` properties.
   *
   * The object has the shape `{styleName: RendererFn}`, where `styleName` is the value set
   * in individual `style` attributes on blocks.
   *
   * Can also be set to a single renderer function, which would handle block styles of _any_ type.
   */
  block:
    | Record<PortableTextBlockStyle, PortableTextBlockRenderer | undefined>
    | PortableTextBlockRenderer

  /**
   * Object of renderer functions used to render different list item styles.
   *
   * The object has the shape `{listItemType: RendererFn}`, where `listItemType` is the value
   * set in individual `listItem` attributes on blocks.
   *
   * Can also be set to a single renderer function, which would handle list items of _any_ type.
   */
  listItem:
    | Record<PortableTextListItemType, PortableTextListItemRenderer | undefined>
    | PortableTextListItemRenderer

  /**
   * Renderer for "hard breaks", eg `\n` inside of text spans.
   * By default renders as Markdown hard break (`  \n` - two trailing spaces).
   */
  hardBreak: () => string

  /**
   * Renderer function used when encountering a mark type there is no registered renderer for
   * in the `marks` option.
   */
  unknownMark: PortableTextMarkRenderer

  /**
   * Renderer function used when encountering an object type there is no registered renderer for
   * in the `types` option.
   */
  unknownType: PortableTextRenderer<UnknownNodeType>

  /**
   * Renderer function used when encountering a block style there is no registered renderer for
   * in the `block` option. Only used if `block` is an object.
   */
  unknownBlockStyle: PortableTextRenderer<PortableTextBlock>

  /**
   * Renderer function used when encountering a list item style there is no registered renderer for
   * in the `listItem` option. Only used if `listItem` is an object.
   */
  unknownListItem: PortableTextRenderer<PortableTextListItemBlock>
}

/**
 * Options received by most Portable Text renderers
 *
 * @public
 */
export interface PortableTextRendererOptions<T> {
  /**
   * Data associated with this portable text node, eg the raw JSON value of a block/type
   */
  value: T

  /**
   * Index within its parent
   */
  index: number

  /**
   * Index of a list item
   */
  listIndex?: number | undefined

  /**
   * Whether or not this node is "inline" - ie as a child of a text block,
   * alongside text spans, or a block in and of itself.
   */
  isInline: boolean

  /**
   * Serialized Markdown of child nodes of this block/type
   */
  children?: string

  /**
   * Function used to render any node that might appear in a portable text array or block,
   * including virtual "toolkit"-nodes like lists and nested spans. You will rarely need
   * to use this.
   */
  renderNode: RenderNode
}

/**
 * Options received by any user-defined type renderer in the input array that is not a text block
 *
 * @public
 */
export type PortableTextTypeRendererOptions<T> = Omit<
  PortableTextRendererOptions<T>,
  'children'
>

/**
 * Options received by Portable Text mark renderers
 *
 * @public
 */
export interface PortableTextMarkRendererOptions<
  M extends TypedObject = ArbitraryTypedObject,
> {
  /**
   * Mark definition, eg the actual data of the annotation. If the mark is a simple decorator, this will be `undefined`
   */
  value?: M

  /**
   * Text content of this mark
   */
  text: string

  /**
   * Key for this mark. The same key can be used amongst multiple text spans within the same block, so don't rely on this to be unique.
   */
  markKey: string | undefined

  /**
   * Type of mark - ie value of `_type` in the case of annotations, or the name of the decorator otherwise - eg `em`, `italic`.
   */
  markType: string

  /**
   * Serialized Markdown of child nodes of this mark
   */
  children: string

  /**
   * Function used to render any node that might appear in a portable text array or block,
   * including virtual "toolkit"-nodes like lists and nested spans. You will rarely need
   * to use this.
   */
  renderNode: RenderNode
}

/**
 * Any node type that we can't identify - eg it has an `_type`,
 * but we don't know anything about its other properties
 */
export type UnknownNodeType =
  | {[key: string]: unknown; _type: string}
  | TypedObject

export type RenderNode = <T extends TypedObject>(
  options: Serializable<T>,
) => string

export interface Serializable<T> {
  node: T
  index: number
  isInline: boolean
  renderNode: RenderNode
}
