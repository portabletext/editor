import type {
  AnnotationSchemaType,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  Schema,
} from './schema'

/**
 * @public
 */
export type StyleFeatures = {
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
}

/**
 * Returns the effective decorators, annotations, lists, and inline objects
 * allowed for a given block style. Each feature type uses the style's own
 * override array when one is defined, and falls back to the top-level schema
 * array when the style does not define an override (`undefined`).
 *
 * This means styles inherit all top-level features by default, and can
 * restrict them by providing an explicit subset (or an empty array for none).
 *
 * @public
 */
export function getStyleFeatures(
  schema: Schema,
  styleName: string | undefined,
): StyleFeatures {
  const style = styleName
    ? schema.styles.find((s) => s.name === styleName)
    : undefined

  return {
    decorators: style?.decorators ?? schema.decorators,
    annotations: style?.annotations ?? schema.annotations,
    lists: style?.lists ?? schema.lists,
    inlineObjects: style?.inlineObjects ?? schema.inlineObjects,
  }
}
