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
