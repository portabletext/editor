import type {Schema} from '@portabletext/schema'
import type {PortableTextMemberSchemaTypes} from './portable-text-member-schema-types'

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
