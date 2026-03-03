import type {PortableTextObject, Schema} from '@portabletext/schema'

/**
 * Matcher function for mapping HTML image elements to Portable Text block or
 * inline objects.
 *
 * @param context - The current schema and key generator
 * @param value - The HTML element attributes (e.g. `src`, `alt`)
 * @param isInline - Whether the image is in an inline context
 * @returns A Portable Text object to represent the image, or `undefined` to skip
 *
 * @public
 */
export type ImageMatcher<
  TValue extends Record<string, unknown> = Record<string, never>,
> = ({
  context,
  value,
  isInline,
}: {
  context: {schema: Schema; keyGenerator: () => string}
  value: TValue
  isInline: boolean
}) => PortableTextObject | undefined

/**
 * @public
 */
export type SchemaMatchers = {
  /**
   * Called whenever the HTML parsing encounters an `<img>` element.
   * The `isInline` flag indicates whether the image is in a block or inline
   * context.
   */
  image?: ImageMatcher<{
    src?: string
    alt?: string
    [key: string]: string | undefined
  }>
}
