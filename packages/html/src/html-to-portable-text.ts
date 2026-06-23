import type {Schema} from '@portabletext/schema'
import {defaultCodeObjectDefinition, defaultSchema} from './default-schema'
import {HtmlDeserializer} from './deserializer/html-deserializer'
import {normalizeBlock} from './deserializer/normalize-block'
import type {SchemaMatchers} from './deserializer/schema-matchers'
import {
  buildObjectMatcher,
  type ExtractValue,
  type ObjectMatcher,
} from './matchers'
import type {DeserializerRule} from './types'

/**
 * Default matcher for a code block. Resolves against the schema's `code`
 * block object when it declares a `code` string field, the shape of the
 * default schema's code object and of `@sanity/code-input`. Schemas that
 * do not declare such an object fall through and the deserializer emits a
 * `code`-decorated text block (or plain text) as the lower-fidelity
 * fallback. Consumers with a different shape can pass their own matcher via
 * `types.code`.
 */
const codeBlockMatcher: ObjectMatcher<
  ExtractValue<typeof defaultCodeObjectDefinition>
> = ({context, value, isInline}) => {
  const defaultMatcher = buildObjectMatcher(defaultCodeObjectDefinition)
  const codeObject = defaultMatcher({context, value, isInline})

  if (!codeObject) {
    return undefined
  }

  if (!('code' in codeObject)) {
    return undefined
  }

  return codeObject
}

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
    code?: ObjectMatcher<{language: string | undefined; code: string}>
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
  const imageMatcher = types?.image
  const codeMatcher = types?.code ?? codeBlockMatcher

  if (!imageMatcher && !codeMatcher) {
    return undefined
  }

  const matchers: SchemaMatchers = {}

  if (imageMatcher) {
    const adaptImage =
      (isInline: boolean): NonNullable<SchemaMatchers['image']> =>
      ({context, props}) => {
        const result = imageMatcher({
          context,
          value: props as {src?: string; alt?: string},
          isInline,
        })
        if (!result) {
          return undefined
        }
        return result as ReturnType<NonNullable<SchemaMatchers['image']>>
      }

    matchers.image = adaptImage(false)
    matchers.inlineImage = adaptImage(true)
  }

  if (codeMatcher) {
    matchers.code = ({context, props}) => {
      const result = codeMatcher({
        context,
        value: props as {language: string | undefined; code: string},
        isInline: false,
      })
      if (!result) {
        return undefined
      }
      return result as ReturnType<NonNullable<SchemaMatchers['code']>>
    }
  }

  return matchers
}
