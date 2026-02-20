import {
  htmlToPortableText,
  type HtmlToPortableTextOptions,
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

// Re-export everything from @portabletext/html for backward compat
export {
  defaultSchema,
  htmlToPortableText,
  normalizeBlock,
  randomKey,
} from '@portabletext/html'
export type {
  ArbitraryTypedObject,
  BlockNormalizationOptions,
  DeserializerRule,
  HtmlDeserializerOptions,
  HtmlParser,
  HtmlToPortableTextOptions,
  ImageSchemaMatcher,
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SchemaMatchers,
  TypedObject,
  WhiteSpacePasteMode,
} from '@portabletext/html'
