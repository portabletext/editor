import type {Schema} from '@portabletext/schema'
import type {PortableTextBlock} from '@portabletext/schema'
import HtmlDeserializer from './html-deserializer'
import type {HtmlDeserializerOptions} from './types'
import {normalizeBlock} from './normalize-block'

/**
 * Convert HTML to Portable Text blocks.
 *
 * Built-in support for Google Docs, Word, Word Online, and Notion HTML.
 *
 * @param html - The HTML string to convert
 * @param schema - A compiled schema from @portabletext/schema
 * @param options - Conversion options
 * @returns Array of Portable Text blocks
 */
export function htmlToPortableText(
  html: string,
  schema: Schema,
  options: HtmlDeserializerOptions = {},
): PortableTextBlock[] {
  const deserializer = new HtmlDeserializer(schema, options)
  return deserializer
    .deserialize(html)
    .map((block) =>
      normalizeBlock(block, {keyGenerator: options.keyGenerator}),
    ) as PortableTextBlock[]
}
