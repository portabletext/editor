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

  // Sanity compiles a shared canonical type instance for each named type,
  // so the same member instance is reached through every position that
  // embeds it. Converting each instance once and sharing the result keeps
  // the walk linear in the size of the compiled schema. Without it, the
  // per-branch ancestor sets below enumerate every simple path through
  // mutually-embedding types, which grows combinatorially.
  //
  // The walk itself runs on an explicit LIFO work stack instead of the
  // call stack: children are pushed in reverse so the drain order is
  // exact DFS pre-order (which the memo's first-expansion-wins
  // semantics depend on), results land in pre-indexed holes so
  // construction order matches the recursive version, and the branch's
  // ancestor names live in one shared set scoped by pop-markers pushed
  // beneath each subtree (O(1) per level where copying the set per
  // level made the walk quadratic, and heap-bounded where call-stack
  // recursion overflowed beyond ~1.5k mutually-embedding types).
  const conversion: Conversion = {
    work: [],
    ancestors: new Map<string, number>(),
    distinctAncestorCount: 0,
    memo: new Map<SchemaType, OfDefinition>(),
    inFlight: new Map<unknown, Array<number>>(),
    rootBlockObjects: new Set<SchemaType>(blockObjectTypes),
  }
  const pendingWork: Array<Work> = []

  const result = {
    block: {
      name: blockType.name,
    },
    span: {
      name: spanType.name,
    },
    styles: styles.map((style: BlockStyleDefinition) => ({
      name: style.value,
      title: style.title,
    })),
    lists: lists.map((list: BlockListDefinition) => ({
      name: list.value,
      title: list.title,
    })),
    decorators: decorators.map((decorator: BlockDecoratorDefinition) => ({
      name: decorator.value,
      title: decorator.title,
    })),
    annotations: annotations.map((annotation) => {
      const built = buildFields(
        conversion,
        annotation.fields,
        undefined,
        annotation,
      )
      pendingWork.push(built.work)
      return {
        name: annotation.name,
        title: annotation.title,
        fields: built.holes,
      }
    }),
    blockObjects: blockObjectTypes.map((blockObject) => {
      const built = buildFields(
        conversion,
        blockObject.fields,
        blockObject.name,
      )
      pendingWork.push(built.work)
      return {
        name: blockObject.name,
        title: blockObject.title,
        fields: built.holes,
      }
    }),
    inlineObjects: inlineObjectTypes.map((inlineObject) => {
      const built = buildFields(
        conversion,
        inlineObject.fields,
        inlineObject.name,
        inlineObject,
      )
      pendingWork.push(built.work)
      return {
        name: inlineObject.name,
        title: inlineObject.title,
        fields: built.holes,
      }
    }),
  }

  pushInOrder(conversion, pendingWork)
  drain(conversion)

  return result
}

type Work = () => void

type Conversion = {
  work: Array<Work>
  /**
   * Reference-counted ancestor names: the same name can be seeded at
   * several depths of one branch (nested inline objects sharing a
   * name), and the recursive implementation's per-branch set copies
   * were naturally reentrant, an inner scope's end never removed the
   * name from the outer scope. A plain shared `Set` is not (`delete`
   * clobbers the outer scope), so scopes increment and decrement
   * counts instead. `distinctAncestorCount` tracks the set size the
   * in-flight state comparison needs.
   */
  ancestors: Map<string, number>
  distinctAncestorCount: number
  memo: Map<SchemaType, OfDefinition>
  /**
   * Inline-object and annotation instances whose field expansion is
   * currently in flight, each with the ancestor-set sizes at their
   * in-flight entries. The recursive implementation re-expanded such
   * instances unconditionally; that terminates while every re-entry
   * grows the ancestor set (richer ancestors cut the inner expansion
   * earlier) and recurses forever exactly when the recursion state
   * repeats, same instance, same ancestor set. Ancestors grow
   * monotonically along a branch, so "same instance at the same or
   * smaller ancestor-set size" identifies the repeated state, and
   * cutting there changes output only for schemas that previously
   * overflowed the stack.
   */
  inFlight: Map<unknown, Array<number>>
  /**
   * The canonical instances of the root-level block object types. Members
   * reaching one of these at any `of` position emit a bare
   * `{type: name}` reference instead of an inline expansion: the root
   * `blockObjects` entry materializes the fields exactly once, and
   * `getSubSchema` resolves bare references against that collection.
   * Without this, each type's single memoized expansion inlines the
   * expansions of every type not on its first-visit ancestor path, and
   * the emitted definition, while cheap to build as a shared DAG, is
   * factorially large as a tree, which is what every consumer
   * (`compileSchema`, React, serialization) walks. Keyed by instance so
   * a same-named but structurally different inline declaration keeps its
   * own inline shape.
   */
  rootBlockObjects: Set<SchemaType>
}

function pushAncestor(conversion: Conversion, name: string): void {
  const count = conversion.ancestors.get(name) ?? 0
  if (count === 0) {
    conversion.distinctAncestorCount++
  }
  conversion.ancestors.set(name, count + 1)
}

function popAncestor(conversion: Conversion, name: string): void {
  const count = conversion.ancestors.get(name) ?? 0
  if (count <= 1) {
    conversion.ancestors.delete(name)
    if (count === 1) {
      conversion.distinctAncestorCount--
    }
    return
  }
  conversion.ancestors.set(name, count - 1)
}

function hasAncestor(conversion: Conversion, name: string): boolean {
  return (conversion.ancestors.get(name) ?? 0) > 0
}

function drain(conversion: Conversion): void {
  let steps = 0
  while (conversion.work.length > 0) {
    conversion.work.pop()!()
    if (++steps > 100_000_000) {
      // Circuit breaker: legal schemas stay far below this (the output
      // of n mutually-embedding types is inherently O(n^2) entries, so
      // a 3,200-type graph legitimately drains ~10M work items; 100M
      // corresponds to a schema no Studio could load anyway). Failing
      // with a diagnostic beats exhausting the heap in a Studio tab if
      // a future schema shape finds a cycle the cuts miss.
      throw new Error(
        `Portable Text schema conversion exceeded ${steps} work items; ` +
          'the schema type graph likely contains a cycle the conversion ' +
          `cannot cut (in-flight ancestors: [${[...conversion.ancestors.keys()].join(', ')}])`,
      )
    }
  }
}

/**
 * Allocate the holes for a field list and return them together with the
 * work that fills them, run under an ancestor scope extended with
 * `seedName` (the eager version passed `new Set([...current, seed])`;
 * at the top level the shared set is empty between siblings, so
 * extending equals seeding). The scope's pop-marker sits beneath the
 * field work on the stack, so the shared ancestor set is back to its
 * surrounding state once the subtree drains. The caller pushes the
 * returned works through `pushInOrder` so siblings drain in
 * construction order, keeping the walk's DFS pre-order (and with it
 * the memo's first-expansion positions) identical to the recursive
 * version.
 */
function buildFields(
  conversion: Conversion,
  fields: ReadonlyArray<{name: string; type: SchemaType}>,
  seedName: string | undefined,
  inFlightKey?: unknown,
): {holes: Array<FieldDefinition>; work: Work} {
  const holes: Array<FieldDefinition> = []
  const work = () => {
    if (inFlightKey !== undefined) {
      const entrySizes = conversion.inFlight.get(inFlightKey)
      const ancestorCount = conversion.distinctAncestorCount
      if (
        entrySizes !== undefined &&
        entrySizes.length > 0 &&
        ancestorCount <= entrySizes[entrySizes.length - 1]!
      ) {
        // The recursion state (this instance, this ancestor set) is
        // already in flight on the current branch: the recursive
        // implementation looped forever here. Leave the fields empty.
        return
      }
      if (entrySizes === undefined) {
        conversion.inFlight.set(inFlightKey, [ancestorCount])
      } else {
        entrySizes.push(ancestorCount)
      }
      conversion.work.push(() => {
        const sizes = conversion.inFlight.get(inFlightKey)
        sizes?.pop()
        if (sizes !== undefined && sizes.length === 0) {
          conversion.inFlight.delete(inFlightKey)
        }
      })
    }
    if (seedName !== undefined) {
      pushAncestor(conversion, seedName)
      conversion.work.push(() => popAncestor(conversion, seedName))
    }
    holes.length = fields.length
    for (let index = fields.length - 1; index >= 0; index--) {
      const field = fields[index]!
      conversion.work.push(() => scheduleField(conversion, field, holes, index))
    }
  }
  return {holes, work}
}

function pushInOrder(conversion: Conversion, works: Array<Work>): void {
  for (let index = works.length - 1; index >= 0; index--) {
    conversion.work.push(works[index]!)
  }
}

function scheduleField(
  conversion: Conversion,
  field: {name: string; type: SchemaType},
  target: Array<FieldDefinition>,
  index: number,
): void {
  if (field.type.jsonType !== 'array') {
    target[index] = {
      name: field.name,
      type: field.type.jsonType,
      ...(field.type.title ? {title: field.type.title} : {}),
    }
    return
  }

  const ofMembers = safeGetOf(field.type)
  const of: Array<OfDefinition> = ofMembers ? new Array(ofMembers.length) : []
  target[index] = {
    name: field.name,
    type: 'array',
    ...(field.type.title ? {title: field.type.title} : {}),
    of,
  }
  if (ofMembers) {
    for (
      let memberIndex = ofMembers.length - 1;
      memberIndex >= 0;
      memberIndex--
    ) {
      const member = ofMembers[memberIndex]!
      conversion.work.push(() =>
        scheduleOfMember(conversion, member, of, memberIndex),
      )
    }
  }
}

function scheduleOfMember(
  conversion: Conversion,
  memberType: SchemaType,
  target: Array<OfDefinition>,
  index: number,
): void {
  // `findBlockType` walks up the `type.type` chain to the base `block`, so
  // it only detects *whether* this member is a block. A block member's own
  // marks/styles/lists live on `memberType`, which `scheduleBlockOfMember`
  // reads to emit the member's own resolved sub-schema.
  if (findBlockType(memberType)) {
    scheduleBlockOfMember(
      conversion,
      memberType as BlockSchemaType,
      target,
      index,
    )
    return
  }

  // If this member has fields and isn't already in the ancestor chain,
  // emit an INLINE declaration (`type: 'object'` + name + fields). If the
  // type is in the ancestor chain (cycle) or has no fields, emit a bare
  // REFERENCE (just `type: <name>`).
  const hasFields =
    memberType.jsonType === 'object' &&
    'fields' in memberType &&
    Array.isArray((memberType as ObjectSchemaType).fields)

  if (
    !hasFields ||
    hasAncestor(conversion, memberType.name) ||
    conversion.rootBlockObjects.has(memberType)
  ) {
    // Bare reference. The editor's resolver looks up `memberType.name`
    // in the root `blockObjects`. Root block objects take this branch at
    // every nested position, not just on cycles; see
    // `Conversion.rootBlockObjects`.
    target[index] = {
      type: memberType.name,
      ...(memberType.title ? {title: memberType.title} : {}),
    }
    return
  }

  // Each distinct member instance is expanded exactly once per conversion;
  // every later position that reaches the same instance shares the first
  // expansion. Keyed by instance (not name) so that same-named but
  // structurally different inline declarations keep their own shapes.
  // The memo entry lands before the subtree drains, which is
  // output-neutral: any path re-entering this instance mid-expansion
  // carries its name in the ancestor set and cuts to a bare reference
  // before the memo is consulted, and every other position runs after
  // this subtree has fully drained (exact DFS order).
  const memoized = conversion.memo.get(memberType)
  if (memoized) {
    target[index] = memoized
    return
  }

  const fields = (memberType as ObjectSchemaType).fields
  const holes: Array<FieldDefinition> = new Array(fields.length)
  const definition: OfDefinition = {
    type: 'object',
    name: memberType.name,
    ...(memberType.title ? {title: memberType.title} : {}),
    fields: holes,
  }
  conversion.memo.set(memberType, definition)
  target[index] = definition

  pushAncestor(conversion, memberType.name)
  conversion.work.push(() => popAncestor(conversion, memberType.name))
  for (let fieldIndex = fields.length - 1; fieldIndex >= 0; fieldIndex--) {
    const field = fields[fieldIndex]!
    conversion.work.push(() =>
      scheduleField(conversion, field, holes, fieldIndex),
    )
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
function scheduleBlockOfMember(
  conversion: Conversion,
  blockType: BlockSchemaType,
  target: Array<OfDefinition>,
  index: number,
): void {
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

  const pendingWork: Array<Work> = []

  const definition: BlockOfDefinition = {
    type: 'block',
    styles: (Array.isArray(styleList) ? styleList : [])
      .filter((style: BlockStyleDefinition) => style.value)
      .map((style: BlockStyleDefinition) => ({
        name: style.value,
        title: style.title,
      })),
    lists: (Array.isArray(listItemList) ? listItemList : [])
      .filter((list: BlockListDefinition) => list.value)
      .map((list: BlockListDefinition) => ({
        name: list.value,
        title: list.title,
      })),
    decorators: (Array.isArray(spanDecorators) ? spanDecorators : []).map(
      (decorator: BlockDecoratorDefinition) => ({
        name: decorator.value,
        title: decorator.title,
      }),
    ),
    annotations: (Array.isArray(spanAnnotations) ? spanAnnotations : []).map(
      (annotation) => {
        const built = buildFields(
          conversion,
          annotation.fields,
          undefined,
          annotation,
        )
        pendingWork.push(built.work)
        return {
          name: annotation.name,
          title: annotation.title,
          fields: built.holes,
        }
      },
    ),
    inlineObjects: inlineObjectTypes.map((inlineObject) => {
      const built = buildFields(
        conversion,
        inlineObject.fields ?? [],
        inlineObject.name,
        inlineObject,
      )
      pendingWork.push(built.work)
      return {
        name: inlineObject.name,
        title: inlineObject.title,
        fields: built.holes,
      }
    }),
  }
  target[index] = definition

  pushInOrder(conversion, pendingWork)
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

function compileType(rawType: any) {
  return SanitySchema.compile({
    name: 'blockTypeSchema',
    types: [rawType, ...builtinTypes],
  }).get(rawType.name)
}
