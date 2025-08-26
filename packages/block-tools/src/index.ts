import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import type {Schema} from '@portabletext/schema'
import type {ArraySchemaType} from '@sanity/types'
import HtmlDeserializer from './HtmlDeserializer'
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
) {
  const schema = isSanitySchema(schemaType)
    ? sanitySchemaToPortableTextSchema(schemaType)
    : schemaType

  const deserializer = new HtmlDeserializer(schema, options)
  return deserializer
    .deserialize(html)
    .map((block) => normalizeBlock(block, {keyGenerator: options.keyGenerator}))
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
