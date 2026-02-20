import type {Schema} from '@portabletext/schema'
import {defaultSchema} from './default-schema'
import HtmlDeserializer from './HtmlDeserializer'
import type {HtmlDeserializerOptions, TypedObject} from './types'
import {normalizeBlock} from './util/normalizeBlock'

/**
 * Convert HTML to Portable Text blocks.
 *
 * @param html - The HTML to convert to Portable Text
 * @param options - Options for the conversion
 * @returns Array of Portable Text blocks
 * @public
 */
export function htmlToPortableText(
  html: string,
  options: HtmlToPortableTextOptions = {},
) {
  const {schema = defaultSchema, ...deserializerOptions} = options
  const deserializer = new HtmlDeserializer(schema, deserializerOptions)
  return deserializer
    .deserialize(html)
    .map((block) =>
      normalizeBlock(block, {keyGenerator: deserializerOptions.keyGenerator}),
    )
}

/**
 * Options for converting HTML to Portable Text.
 *
 * @public
 */
export interface HtmlToPortableTextOptions extends HtmlDeserializerOptions {
  /**
   * The schema to use for the conversion. Defaults to a built-in schema
   * with common styles, decorators, lists, and annotations.
   */
  schema?: Schema
}

export {defaultSchema} from './default-schema'
export type {ImageSchemaMatcher, SchemaMatchers} from './schema-matchers'
export type {
  ArbitraryTypedObject,
  DeserializerRule,
  HtmlParser,
  WhiteSpacePasteMode,
} from './types'
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
