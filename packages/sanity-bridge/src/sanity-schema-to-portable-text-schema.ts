import type {FieldDefinition, OfDefinition, Schema} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import type {
  ArrayDefinition,
  ArraySchemaType,
  BlockDecoratorDefinition,
  BlockListDefinition,
  BlockSchemaType,
  BlockStyleDefinition,
  ObjectSchemaType,
  PortableTextBlock,
  SchemaType,
  SpanSchemaType,
} from '@sanity/types'

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
  const compiled = sanitySchema.hasOwnProperty('jsonType')
    ? (sanitySchema as ArraySchemaType<PortableTextBlock>)
    : compileType(sanitySchema)

  return sanitySchemaTypeToSchema(compiled)
}

function sanitySchemaTypeToSchema(
  portableTextType: ArraySchemaType<PortableTextBlock>,
): Schema {
  if (!portableTextType) {
    throw new Error("Parameter 'portableTextType' missing (required)")
  }

  const blockType = portableTextType.of?.find(findBlockType) as
    | BlockSchemaType
    | undefined
  if (!blockType) {
    throw new Error('Block type is not defined in this schema (required)')
  }

  const childrenField = blockType.fields?.find(
    (field) => field.name === 'children',
  ) as {type: ArraySchemaType} | undefined
  if (!childrenField) {
    throw new Error('Children field for block type found in schema (required)')
  }

  const ofType = childrenField.type.of
  if (!ofType) {
    throw new Error(
      'Valid types for block children not found in schema (required)',
    )
  }

  const spanType = ofType.find((memberType) => memberType.name === 'span') as
    | ObjectSchemaType
    | undefined
  if (!spanType) {
    throw new Error('Span type not found in schema (required)')
  }

  const inlineObjectTypes = (ofType.filter(
    (memberType) => memberType.name !== 'span',
  ) || []) as ObjectSchemaType[]

  const blockObjectTypes = (portableTextType.of?.filter(
    (field) => field.name !== blockType.name,
  ) || []) as ObjectSchemaType[]

  const styles = resolveEnabledStyles(blockType)
  const decorators = resolveEnabledDecorators(spanType)
  const lists = resolveEnabledListItems(blockType)
  const annotations = (spanType as SpanSchemaType).annotations

  return {
    block: {
      name: blockType.name,
    },
    span: {
      name: spanType.name,
    },
    styles: styles.map((style: BlockStyleDefinition) => ({
      name: style.value,
      title: style.title,
      value: style.value,
    })),
    lists: lists.map((list: BlockListDefinition) => ({
      name: list.value,
      title: list.title,
      value: list.value,
    })),
    decorators: decorators.map((decorator: BlockDecoratorDefinition) => ({
      name: decorator.value,
      title: decorator.title,
      value: decorator.value,
    })),
    annotations: annotations.map((annotation) => ({
      name: annotation.name,
      title: annotation.title,
      fields: annotation.fields.map(sanityFieldToSchemaField),
    })),
    blockObjects: blockObjectTypes.map((blockObject) => ({
      name: blockObject.name,
      title: blockObject.title,
      fields: blockObject.fields.map(sanityFieldToSchemaField),
    })),
    inlineObjects: inlineObjectTypes.map((inlineObject) => ({
      name: inlineObject.name,
      title: inlineObject.title,
      fields: inlineObject.fields.map(sanityFieldToSchemaField),
    })),
    nestedBlocks: collectNestedBlockTypes(blockObjectTypes).map(
      (nestedBlock) => ({
        name: nestedBlock.name,
        fields: nestedBlock.fields.map(sanityFieldToSchemaField),
      }),
    ),
  }
}

function safeGetOf(schemaType: SchemaType): readonly SchemaType[] | undefined {
  try {
    if (schemaType.jsonType === 'array') {
      const arrayOf = (schemaType as ArraySchemaType).of
      return Array.isArray(arrayOf) ? arrayOf : undefined
    }
  } catch {
    // Sanity schema getters can throw -- ignore
  }
  return undefined
}

function sanityFieldToSchemaField(field: {
  name: string
  type: SchemaType
}): FieldDefinition {
  if (field.type.jsonType === 'array') {
    const ofMembers = safeGetOf(field.type)
    return {
      name: field.name,
      type: 'array',
      ...(field.type.title ? {title: field.type.title} : {}),
      of: ofMembers ? ofMembers.map(sanityOfMemberToOfDefinition) : [],
    }
  }

  return {
    name: field.name,
    type: field.type.jsonType,
    ...(field.type.title ? {title: field.type.title} : {}),
  }
}

function sanityOfMemberToOfDefinition(memberType: SchemaType): OfDefinition {
  if (findBlockType(memberType)) {
    return {type: 'block'}
  }

  const result: OfDefinition = {
    type: memberType.name,
    name: memberType.name,
    ...(memberType.title ? {title: memberType.title} : {}),
  }

  if (
    memberType.jsonType === 'object' &&
    'fields' in memberType &&
    Array.isArray((memberType as ObjectSchemaType).fields)
  ) {
    return {
      ...result,
      fields: (memberType as ObjectSchemaType).fields.map(
        sanityFieldToSchemaField,
      ),
    }
  }

  return result
}

function collectNestedBlockTypes(
  objectTypes: Array<ObjectSchemaType>,
): Array<ObjectSchemaType> {
  const nestedBlocks: Array<ObjectSchemaType> = []
  const seen = new Set<string>()

  function walkObjectType(objectType: ObjectSchemaType) {
    if (seen.has(objectType.name)) {
      return
    }
    seen.add(objectType.name)

    for (const field of objectType.fields ?? []) {
      const ofMembers = safeGetOf(field.type)
      if (ofMembers) {
        for (const memberType of ofMembers) {
          if (findBlockType(memberType)) {
            if (!nestedBlocks.some((nb) => nb.name === objectType.name)) {
              nestedBlocks.push(objectType)
            }
          } else if (
            memberType.jsonType === 'object' &&
            memberType.name !== objectType.name
          ) {
            walkObjectType(memberType as ObjectSchemaType)
          }
        }
      } else if (
        field.type.jsonType === 'object' &&
        field.type.name !== objectType.name
      ) {
        walkObjectType(field.type as ObjectSchemaType)
      }
    }
  }

  for (const objectType of objectTypes) {
    walkObjectType(objectType)
  }

  return nestedBlocks
}

function resolveEnabledStyles(blockType: ObjectSchemaType) {
  const styleField = blockType.fields?.find(
    (btField) => btField.name === 'style',
  )
  if (!styleField) {
    throw new Error(
      "A field with name 'style' is not defined in the block type (required).",
    )
  }
  const textStyles =
    styleField.type.options?.list &&
    styleField.type.options.list?.filter(
      (style: {value: string}) => style.value,
    )
  if (!textStyles || textStyles.length === 0) {
    throw new Error(
      'The style fields need at least one style ' +
        "defined. I.e: {title: 'Normal', value: 'normal'}.",
    )
  }
  return textStyles
}

function resolveEnabledDecorators(spanType: ObjectSchemaType) {
  return (spanType as any).decorators
}

function resolveEnabledListItems(blockType: ObjectSchemaType) {
  const listField = blockType.fields?.find(
    (btField) => btField.name === 'listItem',
  )
  if (!listField) {
    throw new Error(
      "A field with name 'listItem' is not defined in the block type (required).",
    )
  }
  const listItems =
    listField.type.options?.list &&
    listField.type.options.list.filter((list: {value: string}) => list.value)
  if (!listItems) {
    throw new Error('The list field need at least to be an empty array')
  }
  return listItems
}

function findBlockType(type: SchemaType): BlockSchemaType | null {
  if (type.type) {
    return findBlockType(type.type)
  }

  if (type.name === 'block') {
    return type as BlockSchemaType
  }

  return null
}

function compileType(rawType: any) {
  return SanitySchema.compile({
    name: 'blockTypeSchema',
    types: [rawType, ...builtinTypes],
  }).get(rawType.name)
}
