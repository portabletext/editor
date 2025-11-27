/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ToolkitPortableTextList,
  ToolkitPortableTextListItem,
} from '@portabletext/toolkit'
import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextBlockStyle,
  PortableTextListItemBlock,
  PortableTextListItemType,
  TypedObject,
} from '@portabletext/types'

/**
 * Options for the Portable Text to HTML function
 */
export interface PortableTextOptions {
  /**
   * Component functions to use for rendering
   */
  components?: Partial<PortableTextHtmlComponents>

  /**
   * Function to call when encountering unknown unknown types, eg blocks, marks,
   * block style, list styles without an associated component function.
   *
   * Will print a warning message to the console by default.
   * Pass `false` to disable.
   */
  onMissingComponent?: MissingComponentHandler | false
}

/**
 * Generic type for portable text components that takes blocks/inline blocks
 *
 * @template N Node types we expect to be rendering (`PortableTextBlock` should usually be part of this)
 */
export type PortableTextComponent<N> = (
  options: PortableTextComponentOptions<N>,
) => string

/**
 * Component function type for rendering portable text blocks (paragraphs, headings, blockquotes etc)
 */
export type PortableTextBlockComponent =
  PortableTextComponent<PortableTextBlock>

/**
 * Component function type for rendering (virtual, not part of the spec) portable text lists
 */
export type PortableTextListComponent =
  PortableTextComponent<HtmlPortableTextList>

/**
 * Component function type for rendering portable text list items
 */
export type PortableTextListItemComponent =
  PortableTextComponent<PortableTextListItemBlock>

/**
 * Component function type for rendering portable text marks and/or decorators
 *
 * @template M The mark type we expect
 */
export type PortableTextMarkComponent<M extends TypedObject = any> = (
  options: PortableTextMarkComponentOptions<M>,
) => string

export type PortableTextTypeComponent<V extends TypedObject = any> = (
  options: PortableTextTypeComponentOptions<V>,
) => string

/**
 * Object defining the different component functions to use for rendering various aspects
 * of Portable Text and user-provided types, where only the overrides needs to be provided.
 */
export type PortableTextComponents = Partial<PortableTextHtmlComponents>

/**
 * Object definining the different component functions to use for rendering various aspects
 * of Portable Text and user-provided types.
 */
export interface PortableTextHtmlComponents {
  /**
   * Object of component functions that renders different types of objects that might appear
   * both as part of the blocks array, or as inline objects _inside_ of a block,
   * alongside text spans.
   *
   * Use the `isInline` property to check whether or not this is an inline object or a block
   *
   * The object has the shape `{typeName: ComponentFn}`, where `typeName` is the value set
   * in individual `_type` attributes.
   */
  types: Record<string, PortableTextTypeComponent | undefined>

  /**
   * Object of component functions that renders different types of marks that might appear in spans.
   *
   * The object has the shape `{markName: ComponentFn}`, where `markName` is the value set
   * in individual `_type` attributes, values being stored in the parent blocks `markDefs`.
   */
  marks: Record<string, PortableTextMarkComponent | undefined>

  /**
   * Object of component functions that renders blocks with different `style` properties.
   *
   * The object has the shape `{styleName: ComponentFn}`, where `styleName` is the value set
   * in individual `style` attributes on blocks.
   *
   * Can also be set to a single component function, which would handle block styles of _any_ type.
   */
  block:
    | Record<PortableTextBlockStyle, PortableTextBlockComponent | undefined>
    | PortableTextBlockComponent

  /**
   * Object of component functions used to render lists of different types (bulleted vs numbered,
   * for instance, which by default is `<ul>` and `<ol>`, respectively)
   *
   * There is no actual "list" node type in the Portable Text specification, but a series of
   * list item blocks with the same `level` and `listItem` properties will be grouped into a
   * virtual one inside of this library.
   *
   * Can also be set to a single component function, which would handle lists of _any_ type.
   */
  list:
    | Record<PortableTextListItemType, PortableTextListComponent | undefined>
    | PortableTextListComponent

  /**
   * Object of component functions used to render different list item styles.
   *
   * The object has the shape `{listItemType: ComponentFn}`, where `listItemType` is the value
   * set in individual `listItem` attributes on blocks.
   *
   * Can also be set to a single component function, which would handle list items of _any_ type.
   */
  listItem:
    | Record<
        PortableTextListItemType,
        PortableTextListItemComponent | undefined
      >
    | PortableTextListItemComponent

  /**
   * Component to use for rendering "hard breaks", eg `\n` inside of text spans
   * Will by default render a `<br />`. Pass `false` to render as-is (`\n`)
   */
  hardBreak: (() => string) | false

  /**
   * Component function used when encountering a mark type there is no registered component for
   * in the `components.marks` prop.
   */
  unknownMark: PortableTextMarkComponent

  /**
   * Component function used when encountering an object type there is no registered component for
   * in the `components.types` prop.
   */
  unknownType: PortableTextComponent<UnknownNodeType>

  /**
   * Component function used when encountering a block style there is no registered component for
   * in the `components.block` prop. Only used if `components.block` is an object.
   */
  unknownBlockStyle: PortableTextComponent<PortableTextBlock>

  /**
   * Component function used when encountering a list style there is no registered component for
   * in the `components.list` prop. Only used if `components.list` is an object.
   */
  unknownList: PortableTextComponent<HtmlPortableTextList>

  /**
   * Component function used when encountering a list item style there is no registered component for
   * in the `components.listItem` prop. Only used if `components.listItem` is an object.
   */
  unknownListItem: PortableTextComponent<PortableTextListItemBlock>
}

/**
 * Options received by most Portable Text components
 *
 * @template T Type of data this component will receive in its `value` property
 */
export interface PortableTextComponentOptions<T> {
  /**
   * Data associated with this portable text node, eg the raw JSON value of a block/type
   */
  value: T

  /**
   * Index within its parent
   */
  index: number

  /**
   * Whether or not this node is "inline" - ie as a child of a text block,
   * alongside text spans, or a block in and of itself.
   */
  isInline: boolean

  /**
   * Serialized HTML of child nodes of this block/type
   */
  children?: string

  /**
   * Function used to render any node that might appear in a portable text array or block,
   * including virtual "toolkit"-nodes like lists and nested spans. You will rarely need
   * to use this.
   */
  renderNode: NodeRenderer
}

/**
 * Options received by any user-defined type in the input array that is not a text block
 *
 * @template T Type of data this component will receive in its `value` property
 */
export type PortableTextTypeComponentOptions<T> = Omit<
  PortableTextComponentOptions<T>,
  'children'
>

/**
 * Options received by Portable Text mark components
 *
 * @template M Shape describing the data associated with this mark, if it is an annotation
 */
export interface PortableTextMarkComponentOptions<
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
   * Serialized HTML of child nodes of this mark
   */
  children: string

  /**
   * Function used to render any node that might appear in a portable text array or block,
   * including virtual "toolkit"-nodes like lists and nested spans. You will rarely need
   * to use this.
   */
  renderNode: NodeRenderer
}

/**
 * Any node type that we can't identify - eg it has an `_type`,
 * but we don't know anything about its other properties
 */
export type UnknownNodeType =
  | {[key: string]: unknown; _type: string}
  | TypedObject

/**
 * Function that renders any node that might appear in a portable text array or block,
 * including virtual "toolkit"-nodes like lists and nested spans
 */
export type NodeRenderer = <T extends TypedObject>(
  options: Serializable<T>,
) => string

export type NodeType =
  | 'block'
  | 'mark'
  | 'blockStyle'
  | 'listStyle'
  | 'listItemStyle'

export type MissingComponentHandler = (
  message: string,
  options: {type: string; nodeType: NodeType},
) => void

export interface Serializable<T> {
  node: T
  index: number
  isInline: boolean
  renderNode: NodeRenderer
}

export interface SerializedBlock {
  _key: string
  children: string
  index: number
  isInline: boolean
  node: PortableTextBlock | PortableTextListItemBlock
}

// Re-exporting these as we don't want to refer to "toolkit" outside of this module

/**
 * A virtual "list" node for Portable Text - not strictly part of Portable Text,
 * but generated by this library to ease the rendering of lists in HTML etc
 */
export type HtmlPortableTextList = ToolkitPortableTextList

/**
 * A virtual "list item" node for Portable Text - not strictly any different from a
 * regular Portable Text Block, but we can guarantee that it has a `listItem` property.
 */
export type HtmlPortableTextListItem = ToolkitPortableTextListItem
