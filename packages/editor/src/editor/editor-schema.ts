import {Schema as SanitySchema} from '@sanity/schema'
import {defineField, defineType, type ObjectSchemaType} from '@sanity/types'
import startCase from 'lodash.startcase'
import type {PortableTextMemberSchemaTypes} from '../types/editor'
import type {
  BaseDefinition,
  FieldDefinition,
  SchemaDefinition,
} from './editor-schema-definition'
import {defaultKeyGenerator} from './key-generator'
import {createLegacySchema} from './legacy-schema'

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
export type EditorSchema = {
  annotations: ReadonlyArray<AnnotationSchemaType>
  block: {
    name: string
  }
  blockObjects: ReadonlyArray<BlockObjectSchemaType>
  decorators: ReadonlyArray<DecoratorSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
  span: {
    name: string
  }
  styles: ReadonlyArray<StyleSchemaType>
  lists: ReadonlyArray<ListSchemaType>
}

/**
 * @public
 */
export type AnnotationSchemaType = BaseDefinition & {
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type BlockObjectSchemaType = BaseDefinition & {
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type DecoratorSchemaType = BaseDefinition & {
  /**
   * @deprecated
   * Use `name` instead
   */
  value: string
}

/**
 * @public
 */
export type InlineObjectSchemaType = BaseDefinition & {
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type ListSchemaType = BaseDefinition & {
  /**
   * @deprecated
   * Use `name` instead
   */
  value: string
}

/**
 * @public
 */
export type StyleSchemaType = BaseDefinition & {
  /**
   * @deprecated
   * Use `name` instead
   */
  value: string
}

export function legacySchemaToEditorSchema(
  schema: PortableTextMemberSchemaTypes,
): EditorSchema {
  return {
    annotations: schema.annotations.map((annotation) => ({
      name: annotation.name,
      fields: annotation.fields.map((field) => ({
        name: field.name,
        type: field.type.jsonType,
        title: field.type.title,
      })),
      title: annotation.title,
    })),
    block: {
      name: schema.block.name,
    },
    blockObjects: schema.blockObjects.map((blockObject) => ({
      name: blockObject.name,
      fields: blockObject.fields.map((field) => ({
        name: field.name,
        type: field.type.jsonType,
        title: field.type.title,
      })),
      title: blockObject.title,
    })),
    decorators: schema.decorators.map((decorator) => ({
      name: decorator.value,
      title: decorator.title,
      value: decorator.value,
    })),
    inlineObjects: schema.inlineObjects.map((inlineObject) => ({
      name: inlineObject.name,
      fields: inlineObject.fields.map((field) => ({
        name: field.name,
        type: field.type.jsonType,
        title: field.type.title,
      })),
      title: inlineObject.title,
    })),
    span: {
      name: schema.span.name,
    },
    styles: schema.styles.map((style) => ({
      name: style.value,
      title: style.title,
      value: style.value,
    })),
    lists: schema.lists.map((list) => ({
      name: list.value,
      title: list.title,
      value: list.value,
    })),
  }
}

export function compileSchemaDefinition<
  TSchemaDefinition extends SchemaDefinition,
>(definition: TSchemaDefinition): EditorSchema {
  return legacySchemaToEditorSchema(
    compileSchemaDefinitionToLegacySchema(definition),
  )
}

export function compileSchemaDefinitionToLegacySchema<
  TSchemaDefinition extends SchemaDefinition,
>(definition?: TSchemaDefinition): PortableTextMemberSchemaTypes {
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

  const pteSchema = createLegacySchema(schema)

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
