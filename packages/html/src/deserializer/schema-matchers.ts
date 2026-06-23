import type {Schema} from '@portabletext/schema'
import type {ArbitraryTypedObject} from '../types'

/**
 * Use the current `Schema` as well as the potential element props to determine
 * what Portable Text Object to use to represent the element.
 */
type ObjectSchemaMatcher<TProps extends Record<string, unknown>> = ({
  context,
  props,
}: {
  context: {schema: Schema; keyGenerator: () => string}
  props: TProps
}) => ArbitraryTypedObject | undefined

/**
 * Use the current `Schema` as well as the potential img element props to
 * determine what Portable Text Object to use to represent the image.
 */
export type ImageSchemaMatcher = ObjectSchemaMatcher<{
  src?: string
  alt?: string
  [key: string]: string | undefined
}>

/**
 * Use the current `Schema` to determine what Portable Text Object to use to
 * represent a code block.
 */
export type CodeBlockSchemaMatcher = ObjectSchemaMatcher<{
  language: string | undefined
  code: string
}>

export type SchemaMatchers = {
  /**
   * Called whenever the HTML parsing encounters an `<img>` element that is
   * inferred to be a block element.
   */
  image?: ImageSchemaMatcher
  /**
   * Called whenever the HTML parsing encounters an `<img>` element that is
   * inferred to be an inline element.
   */
  inlineImage?: ImageSchemaMatcher
  /**
   * Called whenever the HTML parsing encounters a code block, e.g. a `<pre>`
   * tag or a run of monospace paragraphs pasted from Google Docs.
   */
  code?: CodeBlockSchemaMatcher
}
