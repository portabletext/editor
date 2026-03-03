import type {
  AnnotationSchemaType,
  BlockObjectSchemaType,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  Schema,
  StyleSchemaType,
} from '@portabletext/schema'

/**
 * Optional properties that were previously available on schema types when PTE
 * depended on `@sanity/types`. These are typed as `unknown` because PTE itself
 * does not populate them - they may be present when the schema is derived from
 * a Sanity schema via `@portabletext/sanity-bridge`.
 *
 * @public
 */
type SanityCompatProps = {
  icon?: unknown
  i18nTitleKey?: string
  component?: unknown
}

/**
 * A broader version of `Schema` that includes optional Sanity-compatible
 * properties on member types. This is the type returned by
 * `usePortableTextEditor().schemaTypes` for backward compatibility with
 * consumers that previously accessed Sanity-specific properties like `icon`,
 * `component`, and `i18nTitleKey`.
 *
 * The PTE-native `Schema` type in `@portabletext/schema` remains clean.
 * These optional properties are only present when the schema originates from
 * a Sanity schema.
 *
 * @public
 */
export type PortableTextEditorSchemaTypes = {
  block: Schema['block'] & {[key: string]: unknown}
  span: Schema['span'] & {[key: string]: unknown}
  styles: ReadonlyArray<StyleSchemaType & SanityCompatProps>
  lists: ReadonlyArray<ListSchemaType & SanityCompatProps>
  decorators: ReadonlyArray<DecoratorSchemaType & SanityCompatProps>
  annotations: ReadonlyArray<AnnotationSchemaType & SanityCompatProps>
  blockObjects: ReadonlyArray<BlockObjectSchemaType & SanityCompatProps>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType & SanityCompatProps>
}
