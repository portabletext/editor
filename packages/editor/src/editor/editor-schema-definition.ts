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
export type FieldDefinition = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
}

/**
 * @public
 */
export type SchemaDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = {
  decorators?: ReadonlyArray<TBaseDefinition>
  blockObjects?: ReadonlyArray<
    TBaseDefinition & {fields?: ReadonlyArray<FieldDefinition>}
  >
  inlineObjects?: ReadonlyArray<
    TBaseDefinition & {fields?: ReadonlyArray<FieldDefinition>}
  >
  annotations?: ReadonlyArray<
    TBaseDefinition & {fields?: ReadonlyArray<FieldDefinition>}
  >
  lists?: ReadonlyArray<TBaseDefinition>
  styles?: ReadonlyArray<TBaseDefinition>
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
