import type {Schema} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import type {ArrayDefinition, ArraySchemaType} from '@sanity/types'
import {createPortableTextMemberSchemaTypes} from './portable-text-member-schema-types'
import {portableTextMemberSchemaTypesToSchema} from './portable-text-member-schema-types-to-schema'

/**
 * @public
 * Compile a Sanity schema to a Portable Text `Schema`.
 *
 * A Portable Text `Schema` is compatible with a Portable Text
 * `SchemaDefinition` and can be used as configuration for the Portable Text
 * Editor.
 *
 * @example
 * ```tsx
 * const schema = sanitySchemaToPortableTextSchema(sanitySchema)
 *
 * return (
 *   <EditorProvider
 *     initialConfig={{
 *       // ...
 *       schemaDefinition: schema,
 *     }}
 *   >
 *     // ...
 *   </EditorProvider>
 * ```
 */
export function sanitySchemaToPortableTextSchema(
  sanitySchema: ArraySchemaType<unknown> | ArrayDefinition,
): Schema {
  const portableTextMemberSchemaTypes = createPortableTextMemberSchemaTypes(
    sanitySchema.hasOwnProperty('jsonType')
      ? sanitySchema
      : compileType(sanitySchema),
  )

  return portableTextMemberSchemaTypesToSchema(portableTextMemberSchemaTypes)
}

function compileType(rawType: any) {
  return SanitySchema.compile({
    name: 'blockTypeSchema',
    types: [rawType, ...builtinTypes],
  }).get(rawType.name)
}
