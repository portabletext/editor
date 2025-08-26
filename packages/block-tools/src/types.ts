import type {PortableTextObject} from '@portabletext/schema'
import type {SchemaMatchers} from './schema-matchers'

/**
 * @public
 */
export interface TypedObject {
  _type: string
  _key?: string
}

/**
 * @public
 */
export interface ArbitraryTypedObject extends TypedObject {
  [key: string]: unknown
}

export function isArbitraryTypedObject(
  object: unknown,
): object is ArbitraryTypedObject {
  return isRecord(object) && typeof object._type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

export interface MinimalSpan {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
}

export interface MinimalBlock extends TypedObject {
  _type: 'block'
  children: TypedObject[]
  markDefs?: TypedObject[]
  style?: string
  level?: number
  listItem?: string
}

export interface PlaceholderDecorator {
  _type: '__decorator'
  name: string
  children: TypedObject[]
}

export interface PlaceholderAnnotation {
  _type: '__annotation'
  markDef: PortableTextObject
  children: TypedObject[]
}

/**
 * @public
 */
export type HtmlParser = (html: string) => Document

/**
 * @public
 */
export type WhiteSpacePasteMode = 'preserve' | 'remove' | 'normalize'

/**
 * @public
 */
export interface HtmlDeserializerOptions {
  keyGenerator?: () => string
  rules?: DeserializerRule[]
  parseHtml?: HtmlParser
  unstable_whitespaceOnPasteMode?: WhiteSpacePasteMode
  /**
   * Custom schema matchers to use when deserializing HTML to Portable Text.
   * @beta
   */
  matchers?: SchemaMatchers
}

export interface HtmlPreprocessorOptions {
  unstable_whitespaceOnPasteMode?: WhiteSpacePasteMode
}

/**
 * @public
 */
export interface DeserializerRule {
  deserialize: (
    el: Node,
    next: (
      elements: Node | Node[] | NodeList,
    ) => TypedObject | TypedObject[] | undefined,
    createBlock: (props: ArbitraryTypedObject) => {
      _type: string
      block: ArbitraryTypedObject
    },
  ) => TypedObject | TypedObject[] | undefined
}
