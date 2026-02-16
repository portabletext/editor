import type {FieldDefinition, OfDefinition, Schema} from '@portabletext/schema'
import type {ArraySchemaType, ObjectSchemaType, SchemaType} from '@sanity/types'
import type {PortableTextMemberSchemaTypes} from './portable-text-member-schema-types'

/**
 * Safely get the `of` array from a schema type, returning undefined if
 * the type doesn't have one or if accessing it throws (Sanity schema
 * getters can throw on certain types).
 */
function safeGetOf(schemaType: SchemaType): readonly SchemaType[] | undefined {
  try {
    if (schemaType.jsonType === 'array') {
      const arrayOf = (schemaType as ArraySchemaType).of
      return Array.isArray(arrayOf) ? arrayOf : undefined
    }
  } catch {
    // Sanity schema getters can throw — ignore
  }
  return undefined
}

function isBlockType(type: SchemaType): boolean {
  if (type.type) {
    return isBlockType(type.type)
  }
  return type.name === 'block'
}

function sanityFieldToOfDefinition(memberType: SchemaType): OfDefinition {
  if (isBlockType(memberType)) {
    return {type: 'block' as const}
  }
  const objectType = memberType as ObjectSchemaType
  return {
    type: objectType.name,
    name: objectType.name,
    title: objectType.title,
    ...(objectType.fields?.length
      ? {fields: objectType.fields.map(sanityFieldToFieldDefinition)}
      : {}),
  }
}

function sanityFieldToFieldDefinition(field: {
  name: string
  type: SchemaType
}): FieldDefinition {
  const base: FieldDefinition = {
    name: field.name,
    type: field.type.jsonType as FieldDefinition['type'],
    title: field.type.title,
  }

  // Carry `of` through on array fields
  const ofMembers = safeGetOf(field.type)
  if (ofMembers?.length) {
    return {
      ...base,
      of: ofMembers.map(sanityFieldToOfDefinition),
    }
  }

  return base
}

/**
 * @public
 * Convert Sanity-specific schema types for Portable Text to a first-class
 * Portable Text schema.
 */
export function portableTextMemberSchemaTypesToSchema(
  schema: PortableTextMemberSchemaTypes,
): Schema {
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
      fields: blockObject.fields.map(sanityFieldToFieldDefinition),
      title: blockObject.title,
    })),
    decorators: schema.decorators.map((decorator) => ({
      name: decorator.value,
      title: decorator.title,
      value: decorator.value,
    })),
    inlineObjects: schema.inlineObjects.map((inlineObject) => ({
      name: inlineObject.name,
      fields: inlineObject.fields.map(sanityFieldToFieldDefinition),
      title: inlineObject.title,
    })),
    nestedBlocks: schema.nestedBlocks.map((nestedBlock) => ({
      name: nestedBlock.name,
      fields: nestedBlock.fields.map(sanityFieldToFieldDefinition),
      title: nestedBlock.title,
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
