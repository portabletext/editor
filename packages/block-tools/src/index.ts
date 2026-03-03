import type {Schema} from '@portabletext/schema'
import HtmlDeserializer from './HtmlDeserializer'
import type {HtmlDeserializerOptions, TypedObject} from './types'
import {normalizeBlock} from './util/normalizeBlock'

/**
 * Convert HTML to blocks respecting the block content type's schema
 *
 * @param html - The HTML to convert to blocks
 * @param schema - A compiled Portable Text schema
 * @param options - Options for deserializing HTML to blocks
 * @returns Array of blocks
 * @public
 */
export function htmlToBlocks(
  html: string,
  schema: Schema,
  options: HtmlDeserializerOptions = {},
) {
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
