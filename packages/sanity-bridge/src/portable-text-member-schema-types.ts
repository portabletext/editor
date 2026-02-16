import type {
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
 * Sanity-specific schema types for Portable Text.
 */
export type PortableTextMemberSchemaTypes = {
  annotations: (ObjectSchemaType & {i18nTitleKey?: string})[]
  block: ObjectSchemaType
  blockObjects: ObjectSchemaType[]
  decorators: BlockDecoratorDefinition[]
  inlineObjects: ObjectSchemaType[]
  nestedBlocks: ObjectSchemaType[]
  portableText: ArraySchemaType<PortableTextBlock>
  span: ObjectSchemaType
  styles: BlockStyleDefinition[]
  lists: BlockListDefinition[]
}

/**
 * @public
 * Create Sanity-specific schema types for Portable Text from a Sanity array
 * schema type.
 */
export function createPortableTextMemberSchemaTypes(
  portableTextType: ArraySchemaType<PortableTextBlock>,
): PortableTextMemberSchemaTypes {
  if (!portableTextType) {
    throw new Error("Parameter 'portabletextType' missing (required)")
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

  // Walk block object fields to find nested block types
  const nestedBlockTypes = collectNestedBlockTypes(blockObjectTypes)

  return {
    styles: resolveEnabledStyles(blockType),
    decorators: resolveEnabledDecorators(spanType),
    lists: resolveEnabledListItems(blockType),
    block: blockType,
    span: spanType,
    portableText: portableTextType,
    inlineObjects: inlineObjectTypes,
    blockObjects: blockObjectTypes,
    nestedBlocks: nestedBlockTypes,
    annotations: (spanType as SpanSchemaType).annotations,
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
