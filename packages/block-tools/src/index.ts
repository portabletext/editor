import type {ArraySchemaType} from '@sanity/types'
import HtmlDeserializer from './HtmlDeserializer'
import type {HtmlDeserializerOptions, TypedObject} from './types'
import type {PortableTextTextBlock} from './types.portable-text'
import {normalizeBlock} from './util/normalizeBlock'
import {getPortableTextSchema} from './util/portable-text-schema'

/**
 * Convert HTML to blocks respecting the block content type's schema
 *
 * @param html - The HTML to convert to blocks
 * @param blockContentType - A compiled version of the schema type for the block content
 * @param options - Options for deserializing HTML to blocks
 * @returns Array of blocks
 * @public
 */
export function htmlToBlocks(
  html: string,
  blockContentType: ArraySchemaType,
  options: HtmlDeserializerOptions = {},
): (TypedObject | PortableTextTextBlock)[] {
  const schema = getPortableTextSchema(blockContentType)
  const deserializer = new HtmlDeserializer(schema, options)
  return deserializer
    .deserialize(html)
    .map((block) => normalizeBlock(block, {keyGenerator: options.keyGenerator}))
}

export type {ArbitraryTypedObject, DeserializerRule, HtmlParser} from './types'
export type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from './types.portable-text'
export type {BlockNormalizationOptions} from './util/normalizeBlock'
export {randomKey} from './util/randomKey'
export {normalizeBlock}
export type {HtmlDeserializerOptions, TypedObject}
