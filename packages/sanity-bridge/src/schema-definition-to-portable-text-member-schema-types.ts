import type {SchemaDefinition} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {defineField, defineType} from '@sanity/types'
import {keyGenerator} from './key-generator'
import {
  createPortableTextMemberSchemaTypes,
  type PortableTextMemberSchemaTypes,
} from './portable-text-member-schema-types'
import {startCase} from './start-case'

const defaultObjectTitles: Record<string, string> = {
  image: 'Image',
  url: 'URL',
}

/**
 * Names that conflict with Sanity's built-in schema types and need temporary
 * names during `SanitySchema.compile` to avoid getting default fields added.
 */
const sanityBuiltinNames = new Set(['file', 'geopoint', 'image', 'slug', 'url'])

/**
 * @public
 * Compile a Portable Text schema definition to Sanity-specific schema types for
 * Portable Text.
 */
export function compileSchemaDefinitionToPortableTextMemberSchemaTypes(
  definition?: SchemaDefinition,
): PortableTextMemberSchemaTypes {
  const blockObjectDefs = definition?.blockObjects ?? []
  const inlineObjectDefs = definition?.inlineObjects ?? []

  // Collect names that appear in both blockObjects and inlineObjects, or that
  // conflict with Sanity built-in types. These need temporary names so that
  // `SanitySchema.compile` doesn't see duplicate type registrations.
  const blockObjectNameSet = new Set(
    blockObjectDefs.map((blockObject) => blockObject.name),
  )
  const inlineObjectNameSet = new Set(
    inlineObjectDefs.map((inlineObject) => inlineObject.name),
  )

  const temporaryBlockObjectNames: Record<string, string> = {}
  const temporaryInlineObjectNames: Record<string, string> = {}
  const blockObjectNames: Record<string, string> = {}
  const inlineObjectNames: Record<string, string> = {}

  for (const name of blockObjectNameSet) {
    if (sanityBuiltinNames.has(name) || inlineObjectNameSet.has(name)) {
      const tmpName = `tmp-${keyGenerator()}-${name}`
      temporaryBlockObjectNames[name] = tmpName
      blockObjectNames[tmpName] = name
    }
  }

  for (const name of inlineObjectNameSet) {
    if (sanityBuiltinNames.has(name) || blockObjectNameSet.has(name)) {
      const tmpName = `tmp-${keyGenerator()}-${name}`
      temporaryInlineObjectNames[name] = tmpName
      inlineObjectNames[tmpName] = name
    }
  }

  const blockObjects = blockObjectDefs.map((blockObject) =>
    defineType({
      type: 'object',
      // Use temporary names to work around `SanitySchema.compile` adding
      // default fields to objects with certain names, and to avoid duplicate
      // type names when a type appears in both blockObjects and inlineObjects.
      name: temporaryBlockObjectNames[blockObject.name] ?? blockObject.name,
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
  )

  const inlineObjects = inlineObjectDefs.map((inlineObject) =>
    defineType({
      type: 'object',
      // Use temporary names to work around `SanitySchema.compile` adding
      // default fields to objects with certain names, and to avoid duplicate
      // type names when a type appears in both blockObjects and inlineObjects.
      name: temporaryInlineObjectNames[inlineObject.name] ?? inlineObject.name,

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
  )

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

  // Restore original names on blockObjects and inlineObjects.
  // These are shared references with portableText.of, so mutating them
  // also restores names in the portableText array type's nested structure.
  for (const blockObject of pteSchema.blockObjects) {
    const originalName = blockObjectNames[blockObject.name]
    if (originalName !== undefined) {
      blockObject.name = originalName
      if (blockObject.type) {
        blockObject.type = {...blockObject.type, name: originalName}
      }
    }
  }

  for (const inlineObject of pteSchema.inlineObjects) {
    const originalName = inlineObjectNames[inlineObject.name]
    if (originalName !== undefined) {
      inlineObject.name = originalName
      if (inlineObject.type) {
        inlineObject.type = {...inlineObject.type, name: originalName}
      }
    }
  }

  return pteSchema
}
