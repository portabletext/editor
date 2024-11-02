import {Schema as SanitySchema} from '@sanity/schema'
import {
  defineField,
  defineType,
  type BlockDecoratorDefinition,
} from '@sanity/types'
import startCase from 'lodash.startcase'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'

/**
 * @alpha
 */
export type BaseDefinition = {
  name: string
  title?: string
  icon?: BlockDecoratorDefinition['icon']
}

/**
 * @alpha
 */
export type SchemaDefinition<
  TBaseDefinition extends BaseDefinition = BaseDefinition,
> = {
  decorators?: ReadonlyArray<TBaseDefinition>
  blockObjects?: ReadonlyArray<TBaseDefinition>
  inlineObjects?: ReadonlyArray<TBaseDefinition>
  annotations?: ReadonlyArray<TBaseDefinition>
  lists?: ReadonlyArray<TBaseDefinition>
  styles?: ReadonlyArray<TBaseDefinition>
}

/**
 * @alpha
 */
export function defineSchema<const TSchemaDefinition extends SchemaDefinition>(
  definition: TSchemaDefinition,
): TSchemaDefinition {
  return definition
}

export function compileSchemaDefinition<
  TSchemaDefinition extends SchemaDefinition,
>(definition?: TSchemaDefinition) {
  const blockObjects =
    definition?.blockObjects?.map((blockObject) =>
      defineType({
        type: 'object',
        name: blockObject.name,
        title: blockObject.title,
        icon: blockObject.icon,
        fields: [],
      }),
    ) ?? []
  const inlineObjects =
    definition?.inlineObjects?.map((inlineObject) =>
      defineType({
        type: 'object',
        name: inlineObject.name,
        title: inlineObject.title,
        icon: inlineObject.icon,
        fields: [],
      }),
    ) ?? []

  const portableTextSchema = defineField({
    type: 'array',
    name: 'portable-text',
    of: [
      ...blockObjects.map((blockObject) => ({type: blockObject.name})),
      {
        type: 'block',
        name: 'block',
        of: inlineObjects.map((inlineObject) => ({type: inlineObject.name})),
        marks: {
          decorators:
            definition?.decorators?.map((decorator) => ({
              title: decorator.title ?? startCase(decorator.name),
              value: decorator.name,
              icon: decorator.icon,
            })) ?? [],
          annotations:
            definition?.annotations?.map((annotation) => ({
              name: annotation.name,
              type: 'object',
              title: annotation.title,
              icon: annotation.icon,
            })) ?? [],
        },
        lists:
          definition?.lists?.map((list) => ({
            value: list.name,
            title: list.title ?? startCase(list.name),
            icon: list.icon,
          })) ?? [],
        styles:
          definition?.styles?.map((style) => ({
            value: style.name,
            title: style.title ?? startCase(style.name),
            icon: style.icon,
          })) ?? [],
      },
    ],
  })

  const schema = SanitySchema.compile({
    types: [portableTextSchema, ...blockObjects, ...inlineObjects],
  }).get('portable-text')

  return getPortableTextMemberSchemaTypes(schema)
}
