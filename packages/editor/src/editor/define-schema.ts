import {Schema as SanitySchema} from '@sanity/schema'
import {defineField, defineType, type ObjectSchemaType} from '@sanity/types'
import startCase from 'lodash.startcase'
import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {createEditorSchema} from './create-editor-schema'
import {defaultKeyGenerator} from './key-generator'

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

const temporaryImageName = `tmp-${defaultKeyGenerator()}-image`
const temporaryUrlName = `tmp-${defaultKeyGenerator()}-url`

const temporaryObjectNames: Record<string, string> = {
  image: temporaryImageName,
  url: temporaryUrlName,
}

const objectNames: Record<string, string> = {
  [temporaryImageName]: 'image',
  [temporaryUrlName]: 'url',
}

const defaultObjectTitles: Record<string, string> = {
  image: 'Image',
  url: 'URL',
}

/**
 * @public
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
        // fields to objects with certain names.
        name: temporaryObjectNames[blockObject.name] ?? blockObject.name,
        title:
          blockObject.title === undefined
            ? // This avoids the default title which is a title case of the object name
              defaultObjectTitles[blockObject.name]
            : blockObject.title,
        fields: [],
      }),
    ) ?? []

  const inlineObjects =
    definition?.inlineObjects?.map((inlineObject) =>
      defineType({
        type: 'object',
        // Very naive way to work around `SanitySchema.compile` adding default
        // fields to objects with certain names.
        name: temporaryObjectNames[inlineObject.name] ?? inlineObject.name,

        title:
          inlineObject.title === undefined
            ? // This avoids the default title which is a title case of the object name
              defaultObjectTitles[inlineObject.name]
            : inlineObject.title,
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
            })) ?? [],
          annotations:
            definition?.annotations?.map((annotation) => ({
              name: annotation.name,
              type: 'object',
              title: annotation.title,
            })) ?? [],
        },
        lists:
          definition?.lists?.map((list) => ({
            value: list.name,
            title: list.title ?? startCase(list.name),
          })) ?? [],
        styles:
          definition?.styles?.map((style) => ({
            value: style.name,
            title: style.title ?? startCase(style.name),
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
      objectNames[blockObject.name] !== undefined
        ? ({
            ...blockObject,
            name: objectNames[blockObject.name],
            type: {
              ...blockObject.type,
              name: objectNames[blockObject.name],
            },
          } as ObjectSchemaType)
        : blockObject,
    ),
    inlineObjects: pteSchema.inlineObjects.map((inlineObject) =>
      objectNames[inlineObject.name] !== undefined
        ? ({
            ...inlineObject,
            name: objectNames[inlineObject.name],
          } as ObjectSchemaType)
        : inlineObject,
    ),
  } satisfies EditorSchema
}
