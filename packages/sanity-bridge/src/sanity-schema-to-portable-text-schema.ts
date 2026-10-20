import type {
  BlockOfDefinition,
  FieldDefinition,
  InlineObjectOfDefinition,
  OfDefinition,
  Schema,
} from '@portabletext/schema'
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
  SchemaTypeDefinition,
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
 * For a raw (uncompiled) array definition whose fields reference a sibling
 * type by name, use `sanitySchemaDefinitionToPortableTextSchema` instead.
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
  const isCompiled = sanitySchema.hasOwnProperty('jsonType')
  const compiled = isCompiled
    ? (sanitySchema as ArraySchemaType<PortableTextBlock>)
    : compileType(sanitySchema)

  if (isCompiled && compiled.jsonType !== 'array') {
    throwNonArrayDiagnostic(compiled)
  }

  return sanitySchemaTypeToSchema(compiled)
}

/**
 * @public
 * Compile a raw (uncompiled) Sanity array definition to a Portable Text
 * `Schema`, resolving named references to sibling types via
 * `options.types`.
 *
 * A raw definition whose fields reference another type by name (for
 * example a `customLink` annotation field typed `customUrl`) fails to
 * compile on its own: `definition` only carries the types nested inside
 * it, not its siblings elsewhere in the schema. Pass those siblings
 * through `options.types`.
 *
 * `options.types` entries named the same as `definition` itself are
 * ignored, `definition` wins, so a complete schema type list that
 * includes the portable text field can be passed as-is. Entries named
 * like one of Sanity's built-in types (`image`, `block`, `span`, ...) are
 * also ignored: Sanity's compiler gives built-ins precedence over
 * same-named custom types.
 *
 * When a reference still cannot be resolved, the thrown error names the
 * fix: ``Unknown type: customUrl. Define 'customUrl' in the schema or
 * pass it via `options.types`.``
 *
 * @example
 * ```tsx
 * const schema = sanitySchemaDefinitionToPortableTextSchema(richTextDefinition, {
 *   types: [customUrl],
 * })
 * ```
 */
export function sanitySchemaDefinitionToPortableTextSchema(
  definition: ArrayDefinition,
  options?: {types?: ReadonlyArray<SchemaTypeDefinition>},
): Schema {
  const types = (options?.types ?? []).filter(
    (type) => type.name !== definition.name,
  )

  try {
    return sanitySchemaTypeToSchema(compileType(definition, types))
  } catch (error) {
    // The matched text is Sanity's own error message for an unresolved
    // named reference, not a string this package controls.
    const unknownType =
      error instanceof Error && /^Unknown type: (.+)$/.exec(error.message)
    if (!unknownType) {
      throw error
    }
    const typeName = unknownType[1]
    throw new Error(
      `Unknown type: ${typeName}. Define '${typeName}' in the schema or pass it via \`options.types\`.`,
      {cause: error},
    )
  }
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

  return mapCompiledTypeGraph({
    portableTextType,
    blockType,
    spanType,
    inlineObjectTypes,
    blockObjectTypes,
    styles,
    decorators,
    lists,
    annotations,
  })
}

function mapCompiledTypeGraph({
  blockType,
  spanType,
  inlineObjectTypes,
  blockObjectTypes,
  styles,
  decorators,
  lists,
  annotations,
}: {
  portableTextType: ArraySchemaType<PortableTextBlock>
  blockType: BlockSchemaType
  spanType: ObjectSchemaType
  inlineObjectTypes: Array<ObjectSchemaType>
  blockObjectTypes: Array<ObjectSchemaType>
  styles: ReadonlyArray<BlockStyleDefinition>
  decorators: ReadonlyArray<BlockDecoratorDefinition>
  lists: ReadonlyArray<BlockListDefinition>
  annotations: ReadonlyArray<ObjectSchemaType>
}): Schema {
  const definitions = new Map<SchemaType, OfDefinition>()
  const rootObjects = new Set<SchemaType>([
    ...blockObjectTypes.map(getDefinitionKey),
    ...inlineObjectTypes.map(getDefinitionKey),
  ])
  const work: Array<() => void> = []

  const mapFields = (
    fields: ReadonlyArray<{name: string; type: SchemaType}>,
  ): Array<FieldDefinition> =>
    fields.map((field) => {
      if (field.type.jsonType !== 'array') {
        return {
          name: field.name,
          type: field.type.jsonType,
          ...(field.type.title ? {title: field.type.title} : {}),
        } as FieldDefinition
      }

      return {
        name: field.name,
        type: 'array',
        ...(field.type.title ? {title: field.type.title} : {}),
        of: (safeGetOf(field.type) ?? []).map(mapType),
      }
    })

  const mapObject = (type: ObjectSchemaType): InlineObjectOfDefinition => {
    const definitionKey = getDefinitionKey(type)
    const memoized = definitions.get(definitionKey)
    if (memoized) {
      return memoized as InlineObjectOfDefinition
    }

    const definition = {
      ...(rootObjects.has(definitionKey) ? {} : {type: 'object' as const}),
      name: type.name,
      ...(type.title ? {title: type.title} : {}),
      fields: [],
    } as InlineObjectOfDefinition
    definitions.set(definitionKey, definition)
    work.push(() =>
      Object.assign(definition, {fields: mapFields(type.fields ?? [])}),
    )
    return definition
  }

  const mapBlock = (type: BlockSchemaType): BlockOfDefinition => {
    const definitionKey = getDefinitionKey(type)
    const memoized = definitions.get(definitionKey)
    if (memoized) {
      return memoized as BlockOfDefinition
    }

    const definition: BlockOfDefinition = {
      type: 'block',
      styles: [],
      lists: [],
      decorators: [],
      annotations: [],
      inlineObjects: [],
    }
    definitions.set(definitionKey, definition)

    const styleList = type.fields?.find((field) => field.name === 'style')?.type
      .options?.list
    const listItemList = type.fields?.find((field) => field.name === 'listItem')
      ?.type.options?.list
    const childrenOf = (
      type.fields?.find((field) => field.name === 'children') as
        | {type: ArraySchemaType}
        | undefined
    )?.type.of
    const nestedSpan = childrenOf?.find(
      (memberType) => memberType.name === 'span',
    ) as SpanSchemaType | undefined

    work.push(() =>
      Object.assign(definition, {
        styles: (Array.isArray(styleList) ? styleList : [])
          .filter((style: BlockStyleDefinition) => style.value)
          .map((style: BlockStyleDefinition) => ({
            name: style.value,
            title: style.title,
            value: style.value,
          })),
        lists: (Array.isArray(listItemList) ? listItemList : [])
          .filter((list: BlockListDefinition) => list.value)
          .map((list: BlockListDefinition) => ({
            name: list.value,
            title: list.title,
            value: list.value,
          })),
        decorators: (nestedSpan?.decorators ?? []).map((decorator) => ({
          name: decorator.value,
          title: decorator.title,
          value: decorator.value,
        })),
        annotations: (nestedSpan?.annotations ?? []).map((annotation) => ({
          name: annotation.name,
          title: annotation.title,
          fields: mapFields(annotation.fields),
        })),
        inlineObjects: (childrenOf ?? [])
          .filter((memberType) => memberType.name !== 'span')
          .map((memberType) => {
            const mapped = mapObject(memberType as ObjectSchemaType)
            return mapped
          }),
      }),
    )
    return definition
  }

  function mapType(type: SchemaType): OfDefinition {
    const definitionKey = getDefinitionKey(type)
    const memoized = definitions.get(definitionKey)
    if (memoized) {
      return memoized
    }
    if (findBlockType(type)) {
      return mapBlock(type as BlockSchemaType)
    }
    if (
      type.jsonType === 'object' &&
      'fields' in type &&
      Array.isArray((type as ObjectSchemaType).fields)
    ) {
      return mapObject(type as ObjectSchemaType)
    }

    const definition: OfDefinition = {
      type: type.name,
      ...(type.title ? {title: type.title} : {}),
    }
    definitions.set(definitionKey, definition)
    return definition
  }

  const result: Schema = {
    block: {name: blockType.name},
    span: {name: spanType.name},
    styles: styles.map((style) => ({
      name: style.value,
      title: style.title,
      value: style.value,
    })),
    lists: lists.map((list) => ({
      name: list.value,
      title: list.title,
      value: list.value,
    })),
    decorators: decorators.map((decorator) => ({
      name: decorator.value,
      title: decorator.title,
      value: decorator.value,
    })),
    annotations: annotations.map((annotation) => ({
      name: annotation.name,
      title: annotation.title,
      fields: mapFields(annotation.fields),
    })),
    blockObjects: blockObjectTypes.map(mapObject),
    inlineObjects: inlineObjectTypes.map(mapObject),
  }
  while (work.length > 0) {
    work.pop()!()
  }
  return result
}

/**
 * Sanity compiles a fresh member instance for every `{type: <name>}`
 * declaration, so the canonical named type is the identity that closes
 * cycles. A member that overrides its type's title or fields (a block
 * member declaring its own `styles` or `marks`, an `image` member adding
 * fields) is its own definition.
 */
function getDefinitionKey(type: SchemaType): SchemaType {
  let definition = type
  while (
    definition.name !== 'object' &&
    definition.type !== undefined &&
    definition.type.name === definition.name &&
    definition.title === definition.type.title &&
    (definition as ObjectSchemaType).fields ===
      (definition.type as ObjectSchemaType).fields
  ) {
    definition = definition.type
  }
  return definition
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

/**
 * Sanity's core built-in type names (`text`, `image`, `url`, `block`, `span`,
 * ...) are baked into the compiler itself and always win a name collision,
 * unlike `builtinTypes` from `@sanity/schema/_internal`, which only carries
 * Studio's extra types (`slug`, `geopoint`, ...) and loses a collision with
 * an explicit `Duplicate type name` error instead. Compiling an empty
 * schema and looking the name up asks Sanity directly which core built-ins
 * exist, rather than hardcoding that list here.
 */
function isBuiltinTypeName(name: string): boolean {
  return Boolean(
    SanitySchema.compile({name: 'builtinProbe', types: []}).get(name),
  )
}

function throwNonArrayDiagnostic(schemaType: SchemaType): never {
  const name = schemaType.name
  const base = `Expected an array schema type but received '${name}' (jsonType: '${schemaType.jsonType}').`
  if (isBuiltinTypeName(name)) {
    throw new Error(
      `${base} '${name}' collides with a Sanity built-in type, so \`.get('${name}')\` returned the built-in type instead of your custom type.`,
    )
  }
  throw new Error(base)
}

const ROOT_PLACEHOLDER_NAME = '__portableTextBridgeRoot'

/**
 * The root compiles under a reserved placeholder name: `.get(rawType.name)`
 * on a root named like a core built-in (`text`, `image`, ...) would return
 * the built-in, since core built-ins always win a name collision. The
 * definition is also registered under its own name so a field elsewhere in
 * the schema typed like the root keeps resolving to it, except when a
 * built-in holds that name: core built-ins silently win the collision and
 * the `builtinTypes` extras (`slug`, `geopoint`, ...) throw a
 * duplicate-name error, so the extras are skipped up front and a
 * same-named field reference resolves to the built-in, as it would in a
 * Studio schema.
 */
function compileType(
  rawType: any,
  types: ReadonlyArray<SchemaTypeDefinition> = [],
) {
  const siblingTypes = types.filter(
    (type) => type.name !== ROOT_PLACEHOLDER_NAME,
  )
  const ownNameRegistration = builtinTypes.some(
    (type: {name?: string}) => type.name === rawType.name,
  )
    ? []
    : [rawType]
  return SanitySchema.compile({
    name: 'blockTypeSchema',
    types: [
      {...rawType, name: ROOT_PLACEHOLDER_NAME},
      ...ownNameRegistration,
      ...siblingTypes,
      ...builtinTypes,
    ],
  }).get(ROOT_PLACEHOLDER_NAME)
}
