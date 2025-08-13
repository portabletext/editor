import type {SchemaDefinition} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {defineField, defineType, type ObjectSchemaType} from '@sanity/types'
import startCase from 'lodash.startcase'
import {keyGenerator} from './key-generator'
import {
  createPortableTextMemberSchemaTypes,
  type PortableTextMemberSchemaTypes,
} from './portable-text-member-schema-types'

const temporaryImageName = `tmp-${keyGenerator()}-image`
const temporaryUrlName = `tmp-${keyGenerator()}-url`

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
 * Compile a Portable Text schema definition to Sanity-specific schema types for
 * Portable Text.
 */
export function compileSchemaDefinitionToPortableTextMemberSchemaTypes(
  definition?: SchemaDefinition,
): PortableTextMemberSchemaTypes {
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
        fields:
          blockObject.fields?.map((field) => ({
            name: field.name,
            type: field.type,
            title: field.title ?? startCase(field.name),
          })) ?? [],
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
        fields:
          inlineObject.fields?.map((field) => ({
            name: field.name,
            type: field.type,
            title: field.title ?? startCase(field.name),
          })) ?? [],
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
              fields:
                annotation.fields?.map((field) => ({
                  name: field.name,
                  title: field.title ?? startCase(field.name),
                  type: field.type,
                })) ?? [],
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

  const pteSchema = createPortableTextMemberSchemaTypes(schema)

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
  } satisfies PortableTextMemberSchemaTypes
}
