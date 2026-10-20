import type {SchemaDefinition} from './define-schema'
import type {
  AnnotationSchemaType,
  BaseDefinition,
  BlockOfDefinition,
  DecoratorSchemaType,
  FieldDefinition,
  InlineObjectOfDefinition,
  InlineObjectSchemaType,
  ListSchemaType,
  OfDefinition,
  Schema,
  StyleSchemaType,
} from './schema'

/**
 * Resolved root schema fields used to fill in unspecified fields on nested
 * `BlockOfDefinition` entries. This is a view into the root schema captured
 * before the `of` tree is walked, so nested blocks inherit the final
 * post-compile values (e.g. `styles` with `normal` prepended).
 */
type BlockInheritance = {
  styles: ReadonlyArray<StyleSchemaType>
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
}

type CompileContext = {
  fields: WeakMap<FieldDefinition, WeakMap<BlockInheritance, FieldDefinition>>
  members: WeakMap<OfDefinition, WeakMap<BlockInheritance, OfDefinition>>
  inheritance: WeakMap<BlockOfDefinition, KeyedMemo<BlockInheritance>>
  explicitInheritance: WeakMap<BlockOfDefinition, BlockInheritance>
}

type KeyedMemo<Value> = {
  value?: Value
  next: WeakMap<object, KeyedMemo<Value>>
}

function isBlockOfMember(member: OfDefinition): member is BlockOfDefinition {
  return member.type === 'block'
}

function isInlineObjectOfMember(
  member: OfDefinition,
): member is InlineObjectOfDefinition {
  const candidate = member as unknown as {
    fields?: unknown
    type?: string
  }
  return (
    candidate.type === 'object' ||
    (candidate.type === undefined && Array.isArray(candidate.fields))
  )
}

function compileOfMember(
  member: OfDefinition,
  inheritance: BlockInheritance,
  context: CompileContext,
): OfDefinition {
  const memoized = context.members.get(member)?.get(inheritance)
  if (memoized) {
    return memoized
  }
  if (isBlockOfMember(member)) {
    const compiled: BlockOfDefinition = {...member}
    setPairMemo(context.members, member, inheritance, compiled)
    Object.assign(compiled, compileBlockOfMember(member, inheritance, context))
    return compiled
  }
  if (isInlineObjectOfMember(member)) {
    const compiled: InlineObjectOfDefinition = {...member, fields: []}
    setPairMemo(context.members, member, inheritance, compiled)
    Object.assign(
      compiled,
      compileInlineObjectOfMember(member, inheritance, context),
    )
    return compiled
  }
  setPairMemo(context.members, member, inheritance, member)
  return member
}

/**
 * Resolve the five sub-schema properties of a block of-member (`styles`,
 * `decorators`, `annotations`, `lists`, `inlineObjects`): each is the
 * member's own declaration (overriding) when present, or the inherited
 * value when absent. The result is also threaded as the inheritance for the
 * member's sibling containers (see `compileField`), so a nested container
 * inherits the block of the container that encloses it rather than the root.
 */
function resolveBlockInheritance(
  member: BlockOfDefinition,
  inheritance: BlockInheritance,
  context: CompileContext,
): BlockInheritance {
  if (
    member.styles &&
    member.decorators &&
    member.annotations &&
    member.lists &&
    member.inlineObjects
  ) {
    const resolved = context.explicitInheritance.get(member)
    if (resolved) {
      return resolved
    }
  }
  // The resolution reads only the inherited lists the member does not
  // override, plus the whole inheritance when annotation or inline object
  // fields compile under it. Keying on those rather than the inheritance
  // object lets a cycle through a container next to this block, which
  // re-enters with the previous resolution as its inheritance, find that
  // resolution again.
  const inheritanceKey: Array<object> = [
    ...(member.styles ? [] : [inheritance.styles]),
    ...(member.decorators ? [] : [inheritance.decorators]),
    ...(member.annotations ? [] : [inheritance.annotations]),
    ...(member.lists ? [] : [inheritance.lists]),
    ...(member.inlineObjects ? [] : [inheritance.inlineObjects]),
    ...(member.annotations || member.inlineObjects ? [inheritance] : []),
  ]
  const memoized = getKeyedMemo(context.inheritance, member, inheritanceKey)
  if (memoized) {
    return memoized
  }
  // Positions that re-enter this block while its members compile copy the
  // `resolved` arrays, so the member arrays are filled in place.
  const annotations: Array<AnnotationSchemaType> = []
  const inlineObjects: Array<InlineObjectSchemaType> = []
  const resolved: BlockInheritance = {
    styles: member.styles
      ? member.styles.map((style) => ({...style, value: style.name}))
      : inheritance.styles,
    decorators: member.decorators
      ? member.decorators.map((decorator) => ({
          ...decorator,
          value: decorator.name,
        }))
      : inheritance.decorators,
    annotations: member.annotations ? annotations : inheritance.annotations,
    lists: member.lists
      ? member.lists.map((list) => ({...list, value: list.name}))
      : inheritance.lists,
    inlineObjects: member.inlineObjects
      ? inlineObjects
      : inheritance.inlineObjects,
  }
  setKeyedMemo(context.inheritance, member, inheritanceKey, resolved)
  if (
    member.styles &&
    member.decorators &&
    member.annotations &&
    member.lists &&
    member.inlineObjects
  ) {
    context.explicitInheritance.set(member, resolved)
  }
  for (const annotation of member.annotations ?? []) {
    annotations.push({
      ...annotation,
      fields:
        annotation.fields?.map((field) =>
          compileField(field, inheritance, context),
        ) ?? [],
    })
  }
  for (const inlineObject of member.inlineObjects ?? []) {
    inlineObjects.push({
      ...inlineObject,
      fields:
        inlineObject.fields?.map((field) =>
          compileField(field, inheritance, context),
        ) ?? [],
    })
  }
  return resolved
}

function compileBlockOfMember(
  member: BlockOfDefinition,
  inheritance: BlockInheritance,
  context: CompileContext,
): BlockOfDefinition {
  return {...member, ...resolveBlockInheritance(member, inheritance, context)}
}

function compileInlineObjectOfMember(
  member: InlineObjectOfDefinition,
  inheritance: BlockInheritance,
  context: CompileContext,
): InlineObjectOfDefinition {
  return {
    ...member,
    fields: member.fields.map((field) =>
      compileField(field, inheritance, context),
    ),
  }
}

function compileField(
  field: FieldDefinition,
  inheritance: BlockInheritance,
  context: CompileContext,
): FieldDefinition {
  const memoized = context.fields.get(field)?.get(inheritance)
  if (memoized) {
    return memoized
  }
  if (field.type === 'array' && field.of) {
    // A container's `{type: 'block'}` member defines the text schema at this
    // position, and its sibling containers inherit that block rather than the
    // root. The block member itself still resolves against the enclosing
    // `inheritance` (its own parent container, or the root at the top level).
    const blockMember = field.of.find(isBlockOfMember)
    const childInheritance = blockMember
      ? resolveBlockInheritance(blockMember, inheritance, context)
      : inheritance
    const compiled: FieldDefinition = {
      ...field,
      of: [],
    }
    setPairMemo(context.fields, field, inheritance, compiled)
    const of = field.of.map((member) =>
      // The block member is `childInheritance` already resolved against the
      // enclosing `inheritance`; reuse it rather than resolving twice. Its
      // sibling containers inherit it.
      member === blockMember
        ? compileOfMember(member, inheritance, context)
        : compileOfMember(member, childInheritance, context),
    )
    Object.assign(compiled, {of})
    return compiled
  }
  setPairMemo(context.fields, field, inheritance, field)
  return field
}

function setPairMemo<Key extends object, Context extends object, Value>(
  memo: WeakMap<Key, WeakMap<Context, Value>>,
  key: Key,
  context: Context,
  value: Value,
): void {
  const values = memo.get(key)
  if (values) {
    values.set(context, value)
  } else {
    memo.set(key, new WeakMap([[context, value]]))
  }
}

function getKeyedMemo<Key extends object, Value>(
  memo: WeakMap<Key, KeyedMemo<Value>>,
  key: Key,
  path: ReadonlyArray<object>,
): Value | undefined {
  let entry = memo.get(key)
  for (const part of path) {
    entry = entry?.next.get(part)
  }
  return entry?.value
}

function setKeyedMemo<Key extends object, Value>(
  memo: WeakMap<Key, KeyedMemo<Value>>,
  key: Key,
  path: ReadonlyArray<object>,
  value: Value,
): void {
  let entry: KeyedMemo<Value> | undefined = memo.get(key)
  if (!entry) {
    entry = {next: new WeakMap()}
    memo.set(key, entry)
  }
  for (const part of path) {
    let next: KeyedMemo<Value> | undefined = entry.next.get(part)
    if (!next) {
      next = {next: new WeakMap()}
      entry.next.set(part, next)
    }
    entry = next
  }
  entry.value = value
}

function compileBaseDefinitionWithValue<T extends BaseDefinition>(
  definition: T,
): T & {value: string} {
  return {...definition, value: definition.name}
}

/**
 * @public
 */
export function compileSchema(definition: SchemaDefinition): Schema {
  const context: CompileContext = {
    fields: new WeakMap(),
    members: new WeakMap(),
    inheritance: new WeakMap(),
    explicitInheritance: new WeakMap(),
  }
  const userStyles = (definition.styles ?? []).map(
    compileBaseDefinitionWithValue,
  )
  const styles = !userStyles.some((style) => style.value === 'normal')
    ? [
        {value: 'normal', name: 'normal', title: 'Normal'} as StyleSchemaType,
        ...userStyles,
      ]
    : userStyles

  const lists = (definition.lists ?? []).map(compileBaseDefinitionWithValue)
  const decorators = (definition.decorators ?? []).map(
    compileBaseDefinitionWithValue,
  )

  // Annotations and inline objects may contain array fields whose `of`
  // includes `{type: 'block'}`. Those nested blocks must inherit from the
  // fully-resolved root. So we build `inheritance` first using the shallow
  // (not-yet-resolved) annotations/inlineObjects — nested blocks inherit from
  // the top-level schema, not from a sibling annotation's schema. Then we
  // resolve annotations, block objects, and inline objects using that view.
  const annotationsShallow = (definition.annotations ?? []).map(
    (annotation) => ({
      ...annotation,
      fields: (annotation.fields ?? []) as ReadonlyArray<FieldDefinition>,
    }),
  )
  const inlineObjectsShallow = (definition.inlineObjects ?? []).map(
    (inlineObject) => ({
      ...inlineObject,
      fields: (inlineObject.fields ?? []) as ReadonlyArray<FieldDefinition>,
    }),
  )

  const inheritance: BlockInheritance = {
    styles,
    decorators,
    annotations: annotationsShallow,
    lists,
    inlineObjects: inlineObjectsShallow,
  }

  const blockFields: Array<FieldDefinition> = []

  if (definition.block?.fields) {
    for (const field of definition.block.fields) {
      if (
        field.name === '_type' ||
        field.name === '_key' ||
        field.name === 'children' ||
        field.name === 'markDefs' ||
        field.name === 'style' ||
        field.name === 'listItem' ||
        field.name === 'level'
      ) {
        console.warn(
          `"${field.name}" is a reserved field name on Portable Text blocks`,
        )
        continue
      }

      blockFields.push(compileField(field, inheritance, context))
    }
  }

  return {
    block: {
      name: definition.block?.name ?? 'block',
      ...(blockFields.length > 0 ? {fields: blockFields} : {}),
    },
    span: {
      name: 'span',
    },
    styles,
    lists,
    decorators,
    annotations: (definition.annotations ?? []).map((annotation) => ({
      ...annotation,
      fields:
        annotation.fields?.map((field) =>
          compileField(field, inheritance, context),
        ) ?? [],
    })),
    blockObjects: (definition.blockObjects ?? []).map((blockObject) =>
      compileRootObject(blockObject, inheritance, context),
    ),
    inlineObjects: (definition.inlineObjects ?? []).map((inlineObject) =>
      compileRootObject(inlineObject, inheritance, context),
    ),
  }
}

function compileRootObject(
  object: {
    name: string
    title?: string
    fields?: ReadonlyArray<FieldDefinition>
  },
  inheritance: BlockInheritance,
  context: CompileContext,
): InlineObjectSchemaType {
  if (object.fields && (!('type' in object) || object.type === 'object')) {
    return compileOfMember(
      object as InlineObjectOfDefinition,
      inheritance,
      context,
    ) as InlineObjectSchemaType
  }
  return {
    ...object,
    fields:
      object.fields?.map((field) =>
        compileField(field, inheritance, context),
      ) ?? [],
  }
}
