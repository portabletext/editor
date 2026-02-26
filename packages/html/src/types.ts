import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextMarkDefinition,
} from '@portabletext/types'

/**
 * Options for converting Portable Text to HTML
 */
export interface PortableTextToHtmlOptions {
  /** Block style renderers */
  block?: Record<string, PortableTextBlockRenderer> | PortableTextBlockRenderer
  /** Mark renderers (decorators + annotations) */
  marks?: Record<string, PortableTextMarkRenderer>
  /** Custom type renderers */
  types?: Record<string, PortableTextTypeRenderer>
  /** List container renderers */
  list?: Record<string, PortableTextListRenderer> | PortableTextListRenderer
  /** List item renderers */
  listItem?: Record<string, PortableTextListItemRenderer> | PortableTextListItemRenderer
  /** Hard break renderer (false to disable) */
  hardBreak?: (() => string) | false
  /** Handler for missing component types (false to suppress warnings) */
  onMissingComponent?: MissingComponentHandler | false
  /** Fallback renderers */
  unknownType?: PortableTextTypeRenderer
  unknownMark?: PortableTextMarkRenderer
  unknownBlockStyle?: PortableTextBlockRenderer
  unknownList?: PortableTextListRenderer
  unknownListItem?: PortableTextListItemRenderer
}

export type MissingComponentHandler = (
  message: string,
  options: {type: string; nodeType: string},
) => void

export interface PortableTextHtmlComponents {
  types: Record<string, PortableTextTypeRenderer>
  marks: Record<string, PortableTextMarkRenderer>
  block: Record<string, PortableTextBlockRenderer>
  list: Record<string, PortableTextListRenderer>
  listItem: Record<string, PortableTextListItemRenderer>
  hardBreak: (() => string) | false
  unknownType: PortableTextTypeRenderer
  unknownMark: PortableTextMarkRenderer
  unknownBlockStyle: PortableTextBlockRenderer
  unknownList: PortableTextListRenderer
  unknownListItem: PortableTextListItemRenderer
}

export type PortableTextBlockRenderer = (props: {
  children: string
  value: PortableTextBlock
}) => string

export type PortableTextListRenderer = (props: {
  children: string
  value: {_type: string; _key: string; listItem: string; level: number}
}) => string

export type PortableTextListItemRenderer = (props: {
  children: string
  value: PortableTextBlock
}) => string

export type PortableTextMarkRenderer = (props: {
  children: string
  text: string
  markType: string
  markKey?: string
  value?: PortableTextMarkDefinition
}) => string

export type PortableTextTypeRenderer = (props: {
  value: ArbitraryTypedObject
  isInline: boolean
  children?: string
}) => string
