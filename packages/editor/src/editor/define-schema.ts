import {Schema as SanitySchema} from '@sanity/schema'
import {
  defineField,
  defineType,
  type BlockDecoratorDefinition,
  type ObjectSchemaType,
} from '@sanity/types'
import startCase from 'lodash.startcase'
import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {createEditorSchema} from './create-editor-schema'

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

/**
 * @alpha
 */
export type EditorSchema = PortableTextMemberSchemaTypes

export function compileSchemaDefinition<
  TSchemaDefinition extends SchemaDefinition,
>(definition?: TSchemaDefinition) {
  const blockObjects =
    definition?.blockObjects?.map((blockObject) =>
      defineType({
        type: 'object',
        // Very naive way to work around `SanitySchema.compile` adding default
        // fields to objects with the name `image`
        name: blockObject.name === 'image' ? 'tmp-image' : blockObject.name,
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

  const pteSchema = createEditorSchema(schema)

  return {
    ...pteSchema,
    blockObjects: pteSchema.blockObjects.map((blockObject) =>
      blockObject.name === 'tmp-image'
        ? ({
            ...blockObject,
            name: 'image',
            type: {
              ...blockObject.type,
              name: 'image',
            },
          } as ObjectSchemaType)
        : blockObject,
    ),
  } satisfies EditorSchema
}
