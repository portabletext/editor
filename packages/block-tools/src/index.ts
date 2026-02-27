import {
  htmlToPortableText,
  type HtmlToPortableTextOptions,
  type TypedObject,
} from '@portabletext/html'
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import type {Schema} from '@portabletext/schema'
import type {ArraySchemaType} from '@sanity/types'

/**
 * Convert HTML to blocks respecting the block content type's schema
 *
 * @param html - The HTML to convert to blocks
 * @param schemaType - A compiled version of the schema type for the block content
 * @param options - Options for deserializing HTML to blocks
 * @returns Array of blocks
 * @public
 * @deprecated Use `htmlToPortableText` from `@portabletext/html` instead
 */
export function htmlToBlocks(
  html: string,
  schemaType: ArraySchemaType | Schema,
  options: HtmlToBlocksOptions = {},
) {
  const schema = isSanitySchema(schemaType)
    ? sanitySchemaToPortableTextSchema(schemaType)
    : schemaType
  const {unstable_whitespaceOnPasteMode, ...rest} = options
  return htmlToPortableText(html, {
    ...rest,
    schema,
    whitespace: unstable_whitespaceOnPasteMode,
  })
}

/**
 * @public
 * @deprecated Use `HtmlToPortableTextOptions` from `@portabletext/html` instead
 */
export interface HtmlToBlocksOptions extends Omit<
  HtmlToPortableTextOptions,
  'schema' | 'whitespace'
> {
  unstable_whitespaceOnPasteMode?: 'preserve' | 'remove' | 'normalize'
}

function isSanitySchema(
  schema: ArraySchemaType | Schema,
): schema is ArraySchemaType {
  return schema.hasOwnProperty('jsonType')
}

// Re-export from @portabletext/html
export {defaultSchema, htmlToPortableText} from '@portabletext/html'
export type {
  HtmlToPortableTextOptions,
  ImageSchemaMatcher,
  SchemaMatchers,
  TypedObject,
} from '@portabletext/html'

export interface ArbitraryTypedObject extends TypedObject {
  [key: string]: unknown
}

export type HtmlParser = (html: string) => Document

export type WhiteSpacePasteMode = 'preserve' | 'remove' | 'normalize'

export interface HtmlDeserializerOptions {
  keyGenerator?: () => string
  rules?: DeserializerRule[]
  parseHtml?: HtmlParser
  whitespace?: WhiteSpacePasteMode
}

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
