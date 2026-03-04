import type {Schema} from '@portabletext/schema'
import {defaultSchema} from './default-schema'
import {HtmlDeserializer} from './deserializer/html-deserializer'
import {normalizeBlock} from './deserializer/normalize-block'
import type {SchemaMatchers} from './deserializer/schema-matchers'
import type {ObjectMatcher} from './matchers'
import type {DeserializerRule} from './types'

/**
 * Options for converting HTML to Portable Text
 *
 * @public
 */
export type HtmlToPortableTextOptions = {
  schema?: Schema
  keyGenerator?: () => string
  parseHtml?: (html: string) => Document
  rules?: DeserializerRule[]
  whitespaceMode?: 'preserve' | 'remove' | 'normalize'
  types?: {
    image?: ObjectMatcher<{src?: string; alt?: string}>
  }
}

/**
 * Convert HTML to Portable Text
 *
 * @param html - The HTML string to convert
 * @param options - Options for the conversion
 * @returns Array of Portable Text blocks
 * @public
 */
export function htmlToPortableText(
  html: string,
  options: HtmlToPortableTextOptions = {},
) {
  const schema = options.schema ?? defaultSchema
  const keyGen = options.keyGenerator

  const matchers = toSchemaMatchers(options.types)

  const deserializer = new HtmlDeserializer(schema, {
    keyGenerator: keyGen,
    rules: options.rules,
    parseHtml: options.parseHtml,
    whitespaceMode: options.whitespaceMode,
    matchers,
  })
  return deserializer
    .deserialize(html)
    .map((block) => normalizeBlock(block, {keyGenerator: keyGen}))
}

/**
 * Convert public ObjectMatcher options to internal SchemaMatchers.
 *
 * ObjectMatcher uses ({context, value, isInline}) matching the
 * @portabletext/markdown API. SchemaMatchers uses ({context, props})
 * matching the internal block-tools engine.
 *
 * If the ObjectMatcher returns a _key, it is preserved. normalizeBlock
 * only assigns a key when one is missing.
 */
function toSchemaMatchers(
  types: HtmlToPortableTextOptions['types'],
): SchemaMatchers | undefined {
  if (!types?.image) {
    return undefined
  }

  const objectMatcher = types.image

  const adapt =
    (isInline: boolean): NonNullable<SchemaMatchers['image']> =>
    ({context, props}) => {
      const result = objectMatcher({
        context,
        value: props as {src?: string; alt?: string},
        isInline,
      })
      if (!result) {
        return undefined
      }
      return result as ReturnType<NonNullable<SchemaMatchers['image']>>
    }

  return {
    image: adapt(false),
    inlineImage: adapt(true),
  }
}
