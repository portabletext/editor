import {htmlToPortableText, type ObjectMatcher} from '@portabletext/html'
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import type {PortableTextBlock, Schema} from '@portabletext/schema'
import type {ArraySchemaType} from '@sanity/types'
import type {ImageSchemaMatcher} from './schema-matchers'
import type {HtmlDeserializerOptions, TypedObject} from './types'
import {normalizeBlock} from './util/normalizeBlock'

/**
 * Convert HTML to blocks respecting the block content type's schema
 *
 * @param html - The HTML to convert to blocks
 * @param schemaType - A compiled version of the schema type for the block content
 * @param options - Options for deserializing HTML to blocks
 * @returns Array of blocks
 * @public
 */
export function htmlToBlocks(
  html: string,
  schemaType: ArraySchemaType | Schema,
  options: HtmlDeserializerOptions = {},
): PortableTextBlock[] {
  const schema = isSanitySchema(schemaType)
    ? sanitySchemaToPortableTextSchema(schemaType)
    : schemaType

  return htmlToPortableText(html, {
    schema,
    keyGenerator: options.keyGenerator,
    parseHtml: options.parseHtml,
    rules: options.rules,
    whitespaceMode: options.unstable_whitespaceOnPasteMode,
    types: adaptMatchers(options.matchers),
  })
}

/**
 * Adapt block-tools' separate image/inlineImage SchemaMatchers to
 * @portabletext/html's single ObjectMatcher with isInline flag.
 */
function adaptMatchers(matchers?: {
  image?: ImageSchemaMatcher
  inlineImage?: ImageSchemaMatcher
}): {image?: ObjectMatcher<{src?: string; alt?: string}>} | undefined {
  if (!matchers?.image && !matchers?.inlineImage) {
    return undefined
  }

  return {
    image: ({context, value, isInline}) => {
      const matcher = isInline ? matchers.inlineImage : matchers.image
      if (!matcher) {
        return undefined
      }
      const result = matcher({context, props: value})
      if (!result) {
        return undefined
      }
      return result as ReturnType<ObjectMatcher<{src?: string; alt?: string}>>
    },
  }
}

export type {ImageSchemaMatcher, SchemaMatchers} from './schema-matchers'
export type {ArbitraryTypedObject, DeserializerRule, HtmlParser} from './types'
export type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
export type {BlockNormalizationOptions} from './util/normalizeBlock'
export {randomKey} from './util/randomKey'
export {normalizeBlock}
export type {HtmlDeserializerOptions, TypedObject}

function isSanitySchema(
  schema: ArraySchemaType | Schema,
): schema is ArraySchemaType {
  return schema.hasOwnProperty('jsonType')
}
