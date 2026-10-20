import type {
  BlockOfDefinition,
  FieldDefinition,
  OfDefinition,
  Schema,
} from '@portabletext/schema'
import {compileSchema} from '@portabletext/schema'
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
 * Oracle: across randomized schema graphs (mutual embedding, cycles,
 * anonymous nesting, inline objects, annotations, restricted nested
 * blocks), the compiled conversion must unfold to the same tree as the
 * compiled output of a recursive reference implementation. On acyclic
 * schemas both unfold completely and must be deep-equal. On cyclic
 * schemas the reference cuts repeated types into markers, so the
 * comparison is bounded and stops at each marker. The reference and its
 * rules are described in its doc comment below.
 */
describe('conversion oracle', () => {
  test('Scenario: Fuzzed schema graphs unfold to the reference conversion', () => {
    let seed = 1337
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const pick = <T>(items: Array<T>): T =>
      items[Math.floor(random() * items.length)]!

    let acyclicRounds = 0
    let cyclicRoundsComparedToReference = 0

    for (let round = 0; round < 40; round++) {
      // Even rounds generate acyclic schemas: every named type ranks,
      // types and lists only reference types and lists ranked after
      // them, and nothing references `blockContent` back, so no inline
      // object or annotation re-enters the root rich text.
      const generateAcyclic = round % 2 === 0
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
      const listTypeNames = Array.from(
        {length: 1 + Math.floor(random() * 3)},
        (_, index) => `list${index}`,
      )
      const richTextNames = Array.from(
        {length: 1 + Math.floor(random() * 2)},
        (_, index) => `richText${index}`,
      )
      const typeRanks = typeNames.map((_, index) => 2 * index + 1)
      const listRanks = listTypeNames.map(() =>
        generateAcyclic ? 2 * Math.floor(random() * (typeCount + 1)) : 0,
      )
      const richTextRanks = richTextNames.map(() =>
        generateAcyclic ? 2 * Math.floor(random() * (typeCount + 1)) : 0,
      )
      const typesAfter = (rank: number) =>
        generateAcyclic
          ? typeNames.filter((_, index) => typeRanks[index]! > rank)
          : typeNames
      const listsAfter = (rank: number) =>
        generateAcyclic
          ? listTypeNames.filter((_, index) => listRanks[index]! > rank)
          : listTypeNames
      const richTextsAfter = (rank: number) =>
        generateAcyclic
          ? richTextNames.filter((_, index) => richTextRanks[index]! > rank)
          : richTextNames
      const subset = <T>(items: Array<T>): Array<T> =>
        items.filter(() => random() < 0.5)

      // Anonymous object array member, nesting another anonymous member
      // and referencing named object and list types, so both named cycles
      // and same-instance re-entries through named list types route
      // through anonymous objects.
      const anonymousMember = (
        depth: number,
        rank: number,
      ): Record<string, unknown> => {
        const fields: Array<Record<string, unknown>> = [
          {name: 'label', type: 'string'},
        ]
        if (random() < 0.5) {
          fields.push({
            name: 'items',
            type: 'array',
            of: [ofMember(depth + 1, rank)],
          })
        }
        const lists = listsAfter(rank)
        if (random() < 0.4 && lists.length > 0) {
          fields.push({name: 'children', type: pick(lists)})
        }
        return {type: 'object', fields}
      }
      const ofMember = (
        depth: number,
        rank: number,
      ): Record<string, unknown> => {
        const types = typesAfter(rank)
        if (depth < 2 && random() < 0.4) {
          return anonymousMember(depth, rank)
        }
        if (types.length === 0) {
          return {type: 'object', fields: [{name: 'label', type: 'string'}]}
        }
        return {type: pick(types)}
      }

      const listTypes = listTypeNames.map((listTypeName, index) => ({
        name: listTypeName,
        type: 'array',
        of: [anonymousMember(0, listRanks[index]!)],
      }))

      // Portable Text arrays other than `blockContent`, whose block
      // restricts styles, decorators, lists, annotations and inline
      // objects, so nested blocks with their own lists appear in acyclic
      // rounds too.
      const richTextTypes = richTextNames.map((richTextName, index) => {
        const types = typesAfter(richTextRanks[index]!)
        return {
          name: richTextName,
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'},
                ...subset([
                  {title: 'Heading', value: 'h1'},
                  {title: 'Code', value: 'code'},
                ]),
              ],
              lists: subset([
                {title: 'Bullet', value: 'bullet'},
                {title: 'Number', value: 'number'},
              ]),
              marks: {
                decorators: subset([
                  {title: 'Strong', value: 'strong'},
                  {title: 'Code', value: 'code'},
                ]),
                annotations: subset(types)
                  .slice(0, 2)
                  .map((typeName) => ({type: typeName})),
              },
              of: subset(types)
                .slice(0, 2)
                .map((typeName) => ({type: typeName})),
            },
            ...subset(types)
              .slice(0, 2)
              .map((typeName) => ({type: typeName})),
          ],
        }
      })

      const objectTypes = typeNames.map((typeName, typeIndex) => {
        const rank = typeRanks[typeIndex]!
        const types = typesAfter(rank)
        const lists = listsAfter(rank)
        const richTexts = richTextsAfter(rank)
        const fieldCount = 1 + Math.floor(random() * 4)
        const fields = Array.from({length: fieldCount}, (_, fieldIndex) => {
          const kind = random()
          if (kind < 0.35) {
            return {name: `field${fieldIndex}`, type: 'string'}
          }
          if (kind < 0.55 && types.length > 0) {
            // Array referencing random named types: mutual embedding and
            // cycles.
            const memberCount = 1 + Math.floor(random() * 3)
            return {
              name: `field${fieldIndex}`,
              type: 'array',
              of: Array.from({length: memberCount}, () => ({
                type: pick(types),
              })),
            }
          }
          if (kind < 0.65 && !generateAcyclic) {
            // Portable Text array embedding the shared blockContent.
            return {name: `field${fieldIndex}`, type: 'blockContent'}
          }
          if (kind < 0.75) {
            // Array mixing anonymous object members with named ones.
            return {
              name: `field${fieldIndex}`,
              type: 'array',
              of: [
                ofMember(0, rank),
                ...(types.length > 0 ? [{type: pick(types)}] : []),
              ],
            }
          }
          if (kind < 0.8 && lists.length > 0) {
            return {name: `field${fieldIndex}`, type: pick(lists)}
          }
          if (kind < 0.9 && richTexts.length > 0) {
            // Portable Text array with its own restricted block.
            return {name: `field${fieldIndex}`, type: pick(richTexts)}
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

      const definitions = [
        blockContent,
        ...objectTypes,
        ...listTypes,
        ...richTextTypes,
      ]
      const acyclic = !hasNamedTypeCycle(definitions)
      if (generateAcyclic) {
        expect(acyclic, `round ${round} generated acyclic`).toBe(true)
      }

      const schema = SanitySchema.compile({
        name: `fuzz${round}`,
        types: definitions,
      })
      const target = schema.get('blockContent')
      const label = `round ${round} (typeCount ${typeCount}, ${acyclic ? 'acyclic' : 'cyclic'})`

      const converted = compileSchema(sanitySchemaToPortableTextSchema(target))

      if (acyclic) {
        acyclicRounds++
        const reference = compileSchema(
          referenceSanitySchemaToPortableTextSchema(target),
        )
        expect(unfoldSchemaGraph(converted, Infinity), label).toEqual(
          unfoldSchemaGraph(reference, Infinity),
        )
        continue
      }

      expect(unfoldSchemaGraph(converted, 2), label).toEqual(
        unfoldSchemaGraph(
          compileSchema(sanitySchemaToPortableTextSchema(target)),
          2,
        ),
      )

      let reference: Schema
      try {
        reference = compileSchema(
          referenceSanitySchemaToPortableTextSchema(target),
        )
      } catch (error) {
        // The reference recurses forever when an inline object or
        // annotation re-enters the block that lists it.
        expect(error, label).toBeInstanceOf(RangeError)
        continue
      }
      cyclicRoundsComparedToReference++
      const unfoldedReference = unfoldSchemaGraph(reference, 3)
      expect(
        cutAtReferenceMarkers(
          unfoldSchemaGraph(converted, 3),
          unfoldedReference,
        ),
        label,
      ).toEqual(unfoldedReference)
    }

    expect(acyclicRounds).toBeGreaterThanOrEqual(15)
    expect(cyclicRoundsComparedToReference).toBeGreaterThan(0)
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
 * The pre-rework recursive conversion, the oracle the fuzz above compares
 * against. Its value is being an independent, naive formulation of the
 * same output rules, so it only changes when those rules change, never to
 * match a work-stack detail. Deliberate deviations from the old
 * implementation: the function is renamed, unexported, and inlined here so
 * it can never be mistaken for package surface, and an anonymous object
 * member (name `object`) cuts only when the same instance re-enters its
 * own expansion, emitting `fields: []`.
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
let referenceRootBlockObjects = new Set<SchemaType>()
let referenceActiveAnonymousObjects = new Set<SchemaType>()

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

  referenceRootBlockObjects = new Set<SchemaType>(blockObjectTypes)
  referenceActiveAnonymousObjects = new Set<SchemaType>()

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

  // A member with fields emits an INLINE declaration (`type: 'object'` +
  // name + fields). A member without fields, or a named member whose name
  // is already in the ancestor chain (cycle), emits a bare REFERENCE (just
  // `type: <name>`). Anonymous members cut on instance identity below.
  const hasFields =
    memberType.jsonType === 'object' &&
    'fields' in memberType &&
    Array.isArray((memberType as ObjectSchemaType).fields)
  const isAnonymousObject = memberType.name === 'object'

  if (
    !hasFields ||
    (!isAnonymousObject && ancestorNames.has(memberType.name)) ||
    referenceRootBlockObjects.has(memberType)
  ) {
    // Bare reference, mirroring the production emission rule: root block
    // objects reference by name at every nested position.
    return {
      type: memberType.name,
      ...(memberType.title ? {title: memberType.title} : {}),
    }
  }

  if (referenceActiveAnonymousObjects.has(memberType)) {
    return {
      type: 'object',
      name: memberType.name,
      ...(memberType.title ? {title: memberType.title} : {}),
      fields: [],
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
  if (isAnonymousObject) {
    referenceActiveAnonymousObjects.add(memberType)
  }
  const definition: OfDefinition = {
    type: 'object',
    name: memberType.name,
    ...(memberType.title ? {title: memberType.title} : {}),
    fields: (memberType as ObjectSchemaType).fields.map((field) =>
      sanityFieldToSchemaField(field, nextAncestors, memo),
    ),
  }
  referenceActiveAnonymousObjects.delete(memberType)
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

function hasNamedTypeCycle(
  definitions: ReadonlyArray<{name: string}>,
): boolean {
  const names = new Set(definitions.map((definition) => definition.name))
  const references = new Map(
    definitions.map((definition) => [
      definition.name,
      collectTypeReferences(definition, names),
    ]),
  )
  const finished = new Set<string>()
  const active = new Set<string>()
  const visit = (name: string): boolean => {
    if (active.has(name)) {
      return true
    }
    if (finished.has(name)) {
      return false
    }
    active.add(name)
    const cyclic = [...(references.get(name) ?? [])].some(visit)
    active.delete(name)
    finished.add(name)
    return cyclic
  }
  return [...names].some(visit)
}

function collectTypeReferences(
  definition: object,
  names: ReadonlySet<string>,
): Set<string> {
  const references = new Set<string>()
  const walk = (value: unknown, isDefinitionRoot: boolean) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, false))
      return
    }
    if (typeof value !== 'object' || value === null) {
      return
    }
    for (const [key, item] of Object.entries(value)) {
      if (
        key === 'type' &&
        !isDefinitionRoot &&
        typeof item === 'string' &&
        names.has(item)
      ) {
        references.add(item)
      }
      walk(item, false)
    }
  }
  walk(definition, true)
  return references
}

/**
 * Unfold a compiled schema into a tree: resolve every bare `{type: name}`
 * reference to the root block or inline object of that name, and expand
 * every shared object at each position. Objects with fields unfold
 * `depth` levels deep, then collapse to their name and title; with an
 * infinite depth a cycle throws.
 *
 * The one normalization drops `type: 'object'` from objects with fields:
 * `compileSchema` and `getSubSchema` treat `{type: 'object', fields}` and
 * `{fields}` alike, and the conversion only omits it on root objects it
 * shares with nested positions.
 */
function unfoldSchemaGraph(schema: Schema, depth: number): unknown {
  const roots = new Map(
    [...schema.blockObjects, ...schema.inlineObjects].map((object) => [
      object.name,
      object,
    ]),
  )

  return unfoldGraphValue(schema, roots, depth, new Set())
}

function unfoldGraphValue(
  value: unknown,
  roots: ReadonlyMap<string, Record<string, unknown>>,
  depth: number,
  active: Set<object>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => unfoldGraphValue(item, roots, depth, active))
  }
  if (typeof value !== 'object' || value === null) {
    return value
  }

  const object = value as Record<string, unknown>
  const referenced =
    typeof object['type'] === 'string' &&
    object['type'] !== 'block' &&
    object['type'] !== 'object' &&
    !Array.isArray(object['fields'])
      ? roots.get(object['type'])
      : undefined
  const definition = referenced ?? object
  if (depth === Infinity && active.has(definition)) {
    throw new Error(
      `Cycle through ${String(definition['name'] ?? definition['type'])}`,
    )
  }
  active.add(definition)
  try {
    if (Array.isArray(definition['fields'])) {
      if (depth === 0) {
        return {
          name: definition['name'],
          ...(definition['title'] ? {title: definition['title']} : {}),
        }
      }
      return Object.fromEntries(
        Object.entries(definition)
          .filter(([key]) => key !== 'type')
          .map(([key, item]) => [
            key,
            unfoldGraphValue(item, roots, depth - 1, active),
          ]),
      )
    }

    return Object.fromEntries(
      Object.entries(definition).map(([key, item]) => [
        key,
        unfoldGraphValue(item, roots, depth, active),
      ]),
    )
  } finally {
    active.delete(definition)
  }
}

/**
 * Where the unfolded reference holds a cut marker, replace the unfolded
 * conversion at the same position with that marker if it names the same
 * type, so the comparison stops there and covers everything else. The
 * reference cuts a named type already on its ancestor path into a bare
 * `{type: name}` (unresolved when it is not a root type) and an anonymous
 * object re-entering itself into `fields: []`; its first expansion of a
 * type is reused at later positions with those cuts in place. Every other
 * position of the reference is a full expansion.
 */
function cutAtReferenceMarkers(
  converted: unknown,
  reference: unknown,
): unknown {
  if (Array.isArray(converted) && Array.isArray(reference)) {
    return converted.map((item, index) =>
      cutAtReferenceMarkers(item, reference[index]),
    )
  }
  if (
    typeof converted !== 'object' ||
    converted === null ||
    typeof reference !== 'object' ||
    reference === null
  ) {
    return converted
  }

  const convertedObject = converted as Record<string, unknown>
  const referenceObject = reference as Record<string, unknown>
  const isBareReference =
    typeof referenceObject['type'] === 'string' &&
    referenceObject['type'] !== 'block' &&
    !('fields' in referenceObject)
  if (isBareReference && convertedObject['name'] === referenceObject['type']) {
    return referenceObject
  }
  const isAnonymousCut =
    referenceObject['name'] === 'object' &&
    Array.isArray(referenceObject['fields']) &&
    referenceObject['fields'].length === 0
  if (isAnonymousCut && convertedObject['name'] === 'object') {
    return {...convertedObject, fields: []}
  }

  return Object.fromEntries(
    Object.entries(convertedObject).map(([key, item]) => [
      key,
      cutAtReferenceMarkers(item, referenceObject[key]),
    ]),
  )
}
