/**
 * @public
 */
export type BaseDefinition = {
  name: string
  title?: string
}

/**
 * @public
 */
export type FieldDefinition = BaseDefinition & {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
}

/**
 * @public
 */
export type DecoratorDefinition = BaseDefinition

/**
 * @public
 */
export type AnnotationDefinition = BaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type BlockObjectDefinition = BaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type InlineObjectDefinition = BaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type ListDefinition = BaseDefinition

/**
 * @public
 */
export type StyleDefinition = BaseDefinition

/**
 * @public
 */
export type SchemaDefinition = {
  decorators?: ReadonlyArray<DecoratorDefinition>
  blockObjects?: ReadonlyArray<BlockObjectDefinition>
  inlineObjects?: ReadonlyArray<InlineObjectDefinition>
  annotations?: ReadonlyArray<AnnotationDefinition>
  lists?: ReadonlyArray<ListDefinition>
  styles?: ReadonlyArray<StyleDefinition>
}

/**
 * @public
 * A helper wrapper that adds editor support, such as autocomplete and type checking, for a schema definition.
 * @example
 * ```ts
 * import { defineSchema } from '@portabletext/editor'
 *
 * const schemaDefinition = defineSchema({
 *  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
 *  annotations: [{name: 'link'}],
 *  styles: [
 *    {name: 'normal'},
 *    {name: 'h1'},
 *    {name: 'h2'},
 *    {name: 'h3'},
 *    {name: 'blockquote'},
 *  ],
 *  lists: [],
 *  inlineObjects: [],
 *  blockObjects: [],
 * }
 * ```
 */
export function defineSchema(definition: SchemaDefinition): SchemaDefinition {
  return definition
}
