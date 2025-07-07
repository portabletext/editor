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
export type DecoratorDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = TBaseDefinition

/**
 * @public
 */
export type AnnotationDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = TBaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type BlockObjectDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = TBaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type InlineObjectDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = TBaseDefinition & {
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type ListDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = TBaseDefinition

/**
 * @public
 */
export type StyleDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = TBaseDefinition

/**
 * @public
 */
export type SchemaDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = {
  decorators?: ReadonlyArray<DecoratorDefinition<TBaseDefinition>>
  blockObjects?: ReadonlyArray<BlockObjectDefinition<TBaseDefinition>>
  inlineObjects?: ReadonlyArray<InlineObjectDefinition<TBaseDefinition>>
  annotations?: ReadonlyArray<AnnotationDefinition<TBaseDefinition>>
  lists?: ReadonlyArray<ListDefinition<TBaseDefinition>>
  styles?: ReadonlyArray<StyleDefinition<TBaseDefinition>>
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
export function defineSchema<const TSchemaDefinition extends SchemaDefinition>(
  definition: TSchemaDefinition,
): TSchemaDefinition {
  return definition
}
