import type {
  AnnotationSchemaType,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  Schema,
} from './schema'

export type StyleFeatures = {
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
}

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
