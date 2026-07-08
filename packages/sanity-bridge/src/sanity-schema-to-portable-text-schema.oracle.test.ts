import type {
  BlockOfDefinition,
  FieldDefinition,
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
  SpanSchemaType,
} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

/**
 * Oracle: the work-stack conversion must produce output deep-equal to
 * the recursive implementation it replaced, across randomized schema
 * graphs (mutual embedding, cycles, anonymous nesting, inline objects,
 * annotations, restricted nested blocks).
 */
describe('conversion oracle', () => {
  test('Scenario: Fuzzed schema graphs convert identically to the recursive implementation', () => {
    let seed = 1337
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const pick = <T>(items: Array<T>): T =>
      items[Math.floor(random() * items.length)]!

    for (let round = 0; round < 40; round++) {
      // Sized so the recursive reference stays comparable: block <->
      // inline-object Portable Text cycles make its output grow
      // exponentially with type count even when it terminates (154MB
      // of JSON at one 29-type draw), and deep-equal on that dwarfs
      // the conversions themselves.
      const typeCount = 5 + Math.floor(random() * 12)
      const typeNames = Array.from(
        {length: typeCount},
        (_, index) => `type${index}`,
      )

      const objectTypes = typeNames.map((typeName) => {
        const fieldCount = 1 + Math.floor(random() * 4)
        const fields = Array.from({length: fieldCount}, (_, fieldIndex) => {
          const kind = random()
          if (kind < 0.35) {
            return {name: `field${fieldIndex}`, type: 'string'}
          }
          if (kind < 0.55) {
            // Array referencing random named types: mutual embedding and
            // cycles.
            const memberCount = 1 + Math.floor(random() * 3)
            return {
              name: `field${fieldIndex}`,
              type: 'array',
              of: Array.from({length: memberCount}, () => ({
                type: pick(typeNames),
              })),
            }
          }
          if (kind < 0.65) {
            // Portable Text array embedding the shared blockContent.
            return {name: `field${fieldIndex}`, type: 'blockContent'}
          }
          // Anonymous inline object.
          return {
            name: `field${fieldIndex}`,
            type: 'object',
            fields: [{name: 'nested', type: 'string'}],
          }
        })
        return {name: typeName, type: 'object', fields}
      })

      const blockContent = {
        name: 'blockContent',
        type: 'array',
        of: [
          {
            type: 'block',
            marks: {
              annotations: [
                {
                  name: 'link',
                  type: 'object',
                  fields: [
                    {name: 'href', type: 'string'},
                    {name: 'meta', type: pick(typeNames)},
                  ],
                },
              ],
            },
            of: [{type: pick(typeNames)}],
          },
          ...typeNames
            .filter(() => random() < 0.5)
            .map((typeName) => ({type: typeName})),
        ],
      }

      const schema = SanitySchema.compile({
        name: `fuzz${round}`,
        types: [blockContent, ...objectTypes],
      })
      const target = schema.get('blockContent')

      let referenceResult: unknown
      try {
        referenceResult = referenceSanitySchemaToPortableTextSchema(target)
      } catch (error) {
        // The recursive implementation recurses forever on block ->
        // inline-object/annotation Portable Text cycles (it overflows
        // the call stack); the rework cuts those cycles. Where the
        // reference cannot produce an answer, assert only that the
        // rework terminates.
        expect(error, `round ${round}`).toBeInstanceOf(RangeError)
        expect(
          () => sanitySchemaToPortableTextSchema(target),
          `round ${round} (reference crashed, rework must terminate)`,
        ).not.toThrow()
        continue
      }

      expect(
        sanitySchemaToPortableTextSchema(target),
        `round ${round} (typeCount ${typeCount})`,
      ).toEqual(referenceResult)
    }
  })

  test('Scenario: A block whose inline object carries a Portable Text field converts instead of recursing forever', () => {
    const schema = SanitySchema.compile({
      name: 'footnote-cycle',
      types: [
        {
          name: 'blockContent',
          type: 'array',
          of: [{type: 'block', of: [{type: 'footnote'}]}],
        },
        {
          name: 'footnote',
          type: 'object',
          fields: [{name: 'body', type: 'blockContent'}],
        },
      ],
    })
    const target = schema.get('blockContent')

    // The recursive implementation overflowed the call stack here.
    expect(() => referenceSanitySchemaToPortableTextSchema(target)).toThrow(
      RangeError,
    )

    const converted = sanitySchemaToPortableTextSchema(target)
    const nestedBlock = converted.inlineObjects[0]?.fields.find(
      (field) => field.name === 'body',
    )
    expect(nestedBlock?.name).toBe('body')
    expect(nestedBlock?.type).toBe('array')
  })
})

/**
 * The pre-rework recursive conversion, kept verbatim as the oracle the
 * fuzz above compares against. Do not edit: its whole value is being
 * the old implementation. The only deliberate deviations: the function
 * is renamed, unexported, and inlined here so it can never be mistaken
 * for package surface.
 */
/**
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
function referenceSanitySchemaToPortableTextSchema(
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

  // Sanity compiles a shared canonical type instance for each named type,
  // so the same member instance is reached through every position that
  // embeds it. Converting each instance once and sharing the result keeps
  // the walk linear in the size of the compiled schema. Without it, the
  // per-branch ancestor sets below enumerate every simple path through
  // mutually-embedding types, which grows combinatorially.
  const memo = new Map<SchemaType, OfDefinition>()

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
      fields: annotation.fields.map((field) =>
        sanityFieldToSchemaField(field, new Set(), memo),
      ),
    })),
    blockObjects: blockObjectTypes.map((blockObject) => ({
      name: blockObject.name,
      title: blockObject.title,
      fields: blockObject.fields.map((field) =>
        sanityFieldToSchemaField(field, new Set([blockObject.name]), memo),
      ),
    })),
    inlineObjects: inlineObjectTypes.map((inlineObject) => ({
      name: inlineObject.name,
      title: inlineObject.title,
      fields: inlineObject.fields.map((field) =>
        sanityFieldToSchemaField(field, new Set([inlineObject.name]), memo),
      ),
    })),
  }
}

/**
 * Resolve a container's `{type: 'block'}` `of` member.
 *
 * A nested block carries its own resolved sub-schema: `styles`/`lists` as
 * field options, `decorators`/`annotations` on the span, inline objects as
 * the non-span `of` members of `children`. Sanity resolves these for every
 * block (an undeclared list becomes Sanity's defaults, not the root block's
 * values; a block's inline objects are exactly its own `of`), so there is
 * nothing to inherit and nothing to merge: emit the member's own resolved
 * lists and let `getSubSchema` read them directly.
 *
 * This is what keeps a restricted nested block (a code-block line that
 * strips marks and styles, or declares `of: []`) from leaking the root's
 * decorators, styles, or inline objects into the container.
 */
function resolveBlockOfMember(
  blockType: BlockSchemaType,
  ancestorNames: ReadonlySet<string>,
  memo: Map<SchemaType, OfDefinition>,
): BlockOfDefinition {
  const styleList = blockType.fields?.find((field) => field.name === 'style')
    ?.type.options?.list
  const listItemList = blockType.fields?.find(
    (field) => field.name === 'listItem',
  )?.type.options?.list

  const childrenOf = (
    blockType.fields?.find((field) => field.name === 'children') as
      | {type: ArraySchemaType}
      | undefined
  )?.type.of
  const spanType = childrenOf?.find(
    (memberType) => memberType.name === 'span',
  ) as ObjectSchemaType | undefined
  const inlineObjectTypes = (
    Array.isArray(childrenOf) ? childrenOf : []
  ).filter((memberType) => memberType.name !== 'span') as ObjectSchemaType[]
  const spanDecorators = (
    spanType as unknown as {
      decorators?: ReadonlyArray<BlockDecoratorDefinition>
    }
  )?.decorators
  const spanAnnotations = (spanType as SpanSchemaType | undefined)?.annotations

  return {
    type: 'block',
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
    decorators: (Array.isArray(spanDecorators) ? spanDecorators : []).map(
      (decorator: BlockDecoratorDefinition) => ({
        name: decorator.value,
        title: decorator.title,
        value: decorator.value,
      }),
    ),
    annotations: (Array.isArray(spanAnnotations) ? spanAnnotations : []).map(
      (annotation) => ({
        name: annotation.name,
        title: annotation.title,
        fields: annotation.fields.map((field) =>
          sanityFieldToSchemaField(field, ancestorNames, memo),
        ),
      }),
    ),
    inlineObjects: inlineObjectTypes.map((inlineObject) => ({
      name: inlineObject.name,
      title: inlineObject.title,
      fields: (inlineObject.fields ?? []).map((field) =>
        sanityFieldToSchemaField(
          field,
          new Set([...ancestorNames, inlineObject.name]),
          memo,
        ),
      ),
    })),
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

function sanityFieldToSchemaField(
  field: {
    name: string
    type: SchemaType
  },
  ancestorNames: ReadonlySet<string>,
  memo: Map<SchemaType, OfDefinition>,
): FieldDefinition {
  if (field.type.jsonType === 'array') {
    const ofMembers = safeGetOf(field.type)
    return {
      name: field.name,
      type: 'array',
      ...(field.type.title ? {title: field.type.title} : {}),
      of: ofMembers
        ? ofMembers.map((member) =>
            sanityOfMemberToOfDefinition(member, ancestorNames, memo),
          )
        : [],
    }
  }

  return {
    name: field.name,
    type: field.type.jsonType,
    ...(field.type.title ? {title: field.type.title} : {}),
  }
}

function sanityOfMemberToOfDefinition(
  memberType: SchemaType,
  ancestorNames: ReadonlySet<string>,
  memo: Map<SchemaType, OfDefinition>,
): OfDefinition {
  // `findBlockType` walks up the `type.type` chain to the base `block`, so
  // it only detects *whether* this member is a block. A block member's own
  // marks/styles/lists live on `memberType`, which `resolveBlockOfMember`
  // reads to emit the member's own resolved sub-schema.
  if (findBlockType(memberType)) {
    return resolveBlockOfMember(
      memberType as BlockSchemaType,
      ancestorNames,
      memo,
    )
  }

  // If this member has fields and isn't already in the ancestor chain,
  // emit an INLINE declaration (`type: 'object'` + name + fields). If the
  // type is in the ancestor chain (cycle) or has no fields, emit a bare
  // REFERENCE (just `type: <name>`).
  const hasFields =
    memberType.jsonType === 'object' &&
    'fields' in memberType &&
    Array.isArray((memberType as ObjectSchemaType).fields)

  if (!hasFields || ancestorNames.has(memberType.name)) {
    // Bare reference. The editor's resolver looks up `memberType.name`
    // in `blockObjects` / `inlineObjects`.
    return {
      type: memberType.name,
      ...(memberType.title ? {title: memberType.title} : {}),
    }
  }

  // Each distinct member instance is expanded exactly once per conversion;
  // every later position that reaches the same instance shares the first
  // expansion. Keyed by instance (not name) so that same-named but
  // structurally different inline declarations keep their own shapes.
  const memoized = memo.get(memberType)
  if (memoized) {
    return memoized
  }

  const nextAncestors = new Set(ancestorNames)
  nextAncestors.add(memberType.name)
  const definition: OfDefinition = {
    type: 'object',
    name: memberType.name,
    ...(memberType.title ? {title: memberType.title} : {}),
    fields: (memberType as ObjectSchemaType).fields.map((field) =>
      sanityFieldToSchemaField(field, nextAncestors, memo),
    ),
  }
  memo.set(memberType, definition)
  return definition
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
