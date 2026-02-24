import type {Schema} from '@portabletext/schema'
import {defaultSchema} from './default-schema'
import HtmlDeserializer from './HtmlDeserializer'
import type {HtmlDeserializerOptions} from './types'
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
export interface HtmlToPortableTextOptions {
  /**
   * The schema to use for the conversion. Defaults to a built-in schema
   * with common styles, decorators, lists, and annotations.
   */
  schema?: Schema

  /**
   * Custom key generator function. Called to generate unique `_key` values
   * for blocks and spans.
   */
  keyGenerator?: () => string

  /**
   * Whitespace handling mode.
   *
   * - `'preserve'` - Keep whitespace as-is
   * - `'remove'` - Strip unnecessary whitespace
   * - `'normalize'` - Normalize whitespace to single spaces
   */
  whitespace?: 'preserve' | 'remove' | 'normalize'

  /**
   * Custom deserialization rules. Rules are applied in order and can
   * override the default HTML-to-Portable-Text conversion for specific
   * elements.
   */
  rules?: HtmlDeserializerOptions['rules']

  /**
   * Custom HTML parser function. Defaults to the browser's built-in
   * DOMParser (or jsdom in Node.js).
   */
  parseHtml?: (html: string) => Document

  /**
   * Custom schema matchers for images.
   * @beta
   */
  matchers?: HtmlDeserializerOptions['matchers']
}

export {defaultSchema} from './default-schema'
export type {ImageSchemaMatcher, SchemaMatchers} from './schema-matchers'
export type {TypedObject} from './types'
