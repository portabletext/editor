import {
  isSpan,
  isTextBlock,
  type AnnotationSchemaType,
  type BaseDefinition,
  type BlockObjectSchemaType,
  type DecoratorSchemaType,
  type InlineObjectSchemaType,
  type ListSchemaType,
  type OfDefinition,
  type PortableTextBlock,
  type PortableTextListBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
  type StyleSchemaType,
  type TypedObject,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {isRecord, isTypedObject} from './asserters'

type AnyField = {
  name: string
  type: string
  of?: ReadonlyArray<OfDefinition>
}

/**
 * Shape of a compiled `{type: 'block'}` entry inside a container field's
 * `of`. `compileSchema` resolves every sub-schema field, so after
 * compilation these are always populated (though the input type declares
 * them optional).
 */
type BlockOfDefinitionResolved = {
  type: 'block'
  name?: string
  title?: string
  styles?: ReadonlyArray<BaseDefinition>
  decorators?: ReadonlyArray<BaseDefinition>
  annotations?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<AnyField>}
  >
  lists?: ReadonlyArray<BaseDefinition>
  inlineObjects?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<AnyField>}
  >
}

/**
 * The resolved view used to validate a text block and its children at a given
 * depth. At the root of the document it is built from the schema. Inside a
 * container field it is built from the field's `of` -- the `{type: 'block'}`
 * entry (with its sub-schema fully resolved by `compileSchema`) plus any
 * non-block siblings acting as block-object members at that scope.
 */
type BlockScope = {
  block: {name: string}
  blockCustomFields: ReadonlyArray<string>
  span: {name: string}
  styles: ReadonlyArray<StyleSchemaType>
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
  blockObjects: ReadonlyArray<BlockObjectSchemaType>
}

function rootBlockScope(schema: EditorContext['schema']): BlockScope {
  return {
    block: {name: schema.block.name},
    blockCustomFields: (schema.block.fields ?? []).map((field) => field.name),
    span: {name: schema.span.name},
    styles: schema.styles,
    decorators: schema.decorators,
    annotations: schema.annotations,
    lists: schema.lists,
    inlineObjects: schema.inlineObjects,
    blockObjects: schema.blockObjects,
  }
}

/**
 * Build a child `BlockScope` from a container field's `of` members. The
 * `{type: 'block'}` entry (if present) supplies the resolved sub-schema; the
 * non-block members become the scope's block objects. When there is no
 * `{type: 'block'}` entry the returned scope still carries root's `block`
 * and `span` names for fallback, but every validation list is empty.
 */
function childBlockScope(
  schema: EditorContext['schema'],
  of: ReadonlyArray<OfDefinition>,
): BlockScope {
  const blockMember = of.find(
    (member): member is BlockOfDefinitionResolved => member.type === 'block',
  )
  const objectMembers: Array<{
    type: string
    name?: string
    title?: string
    fields: ReadonlyArray<AnyField>
  }> = []

  for (const member of of) {
    if (member.type === 'block') {
      continue
    }
    const objectMember = member as {
      type: string
      name?: string
      title?: string
      fields?: ReadonlyArray<AnyField>
    }
    objectMembers.push({
      type: objectMember.type,
      name: objectMember.name,
      title: objectMember.title,
      fields: objectMember.fields ?? [],
    })
  }

  const blockObjects: ReadonlyArray<BlockObjectSchemaType> = objectMembers.map(
    (member) => ({
      name: member.name ?? member.type,
      title: member.title,
      fields: member.fields as BlockObjectSchemaType['fields'],
    }),
  )

  if (!blockMember) {
    return {
      block: {name: schema.block.name},
      blockCustomFields: [],
      span: {name: schema.span.name},
      styles: [],
      decorators: [],
      annotations: [],
      lists: [],
      inlineObjects: [],
      blockObjects,
    }
  }

  return {
    block: {name: blockMember.name ?? schema.block.name},
    blockCustomFields: [],
    span: {name: schema.span.name},
    styles: asSchemaTypes(blockMember.styles, schema.styles),
    decorators: asSchemaTypes(blockMember.decorators, schema.decorators),
    annotations: asAnnotationTypes(blockMember.annotations, schema.annotations),
    lists: asSchemaTypes(blockMember.lists, schema.lists),
    inlineObjects: asInlineObjectTypes(
      blockMember.inlineObjects,
      schema.inlineObjects,
    ),
    blockObjects,
  }
}

function asSchemaTypes<T extends {name: string; value: string}>(
  resolved: ReadonlyArray<BaseDefinition> | undefined,
  fallback: ReadonlyArray<T>,
): ReadonlyArray<T> {
  if (!resolved) {
    return fallback
  }
  return resolved.map(
    (entry) => ({...entry, value: entry.name}) as unknown as T,
  )
}

function asAnnotationTypes(
  resolved:
    | ReadonlyArray<BaseDefinition & {fields?: ReadonlyArray<unknown>}>
    | undefined,
  fallback: ReadonlyArray<AnnotationSchemaType>,
): ReadonlyArray<AnnotationSchemaType> {
  if (!resolved) {
    return fallback
  }
  return resolved.map((entry) => ({
    ...entry,
    fields: (entry.fields ?? []) as AnnotationSchemaType['fields'],
  }))
}

function asInlineObjectTypes(
  resolved:
    | ReadonlyArray<BaseDefinition & {fields?: ReadonlyArray<unknown>}>
    | undefined,
  fallback: ReadonlyArray<InlineObjectSchemaType>,
): ReadonlyArray<InlineObjectSchemaType> {
  if (!resolved) {
    return fallback
  }
  return resolved.map((entry) => ({
    ...entry,
    fields: (entry.fields ?? []) as InlineObjectSchemaType['fields'],
  }))
}

export function parseBlocks({
  context,
  blocks,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  blocks: unknown
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): Array<PortableTextBlock> {
  if (!Array.isArray(blocks)) {
    return []
  }

  const scope = rootBlockScope(context.schema)

  return blocks.flatMap((block) => {
    const parsedBlock = parseBlockInScope({context, scope, block, options})

    return parsedBlock ? [parsedBlock] : []
  })
}

export function parseBlock({
  context,
  block,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  block: unknown
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextBlock | undefined {
  return parseBlockInScope({
    context,
    scope: rootBlockScope(context.schema),
    block,
    options,
  })
}

export function parseSpan({
  span,
  context,
  markDefKeyMap,
  options,
}: {
  span: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | undefined {
  return parseSpanInScope({
    span,
    context,
    scope: rootBlockScope(context.schema),
    markDefKeyMap,
    options,
  })
}

export function parseInlineObject({
  inlineObject,
  context,
  options,
}: {
  inlineObject: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  return parseInlineObjectInScope({
    inlineObject,
    context,
    scope: rootBlockScope(context.schema),
    options,
  })
}

export function parseChild({
  child,
  context,
  markDefKeyMap,
  options,
}: {
  child: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | PortableTextObject | undefined {
  return parseChildInScope({
    child,
    context,
    scope: rootBlockScope(context.schema),
    markDefKeyMap,
    options,
  })
}

export function parseMarkDefs({
  context,
  markDefs,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  markDefs: unknown
  options: {validateFields: boolean}
}): {
  markDefs: Array<PortableTextObject>
  markDefKeyMap: Map<string, string>
} {
  return parseMarkDefsInScope({
    context,
    scope: rootBlockScope(context.schema),
    markDefs,
    options,
  })
}

function parseBlockInScope({
  context,
  scope,
  block,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  block: unknown
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextBlock | undefined {
  return (
    parseTextBlock({block, context, scope, options}) ??
    parseBlockObject({blockObject: block, context, scope, options})
  )
}

function parseBlockObject({
  blockObject,
  context,
  scope,
  options,
}: {
  blockObject: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(blockObject)) {
    return undefined
  }

  const schemaType = scope.blockObjects.find(
    ({name}) => name === blockObject._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: blockObject,
    context,
    schemaType,
    options,
  })
}

export function isListBlock(
  context: Pick<EditorContext, 'schema'>,
  block: unknown,
): block is PortableTextListBlock {
  return (
    isTextBlock(context, block) &&
    block.level !== undefined &&
    block.listItem !== undefined
  )
}

function parseTextBlock({
  block,
  context,
  scope,
  options,
}: {
  block: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextTextBlock | undefined {
  if (!isTypedObject(block)) {
    return undefined
  }

  if (block._type !== scope.block.name) {
    return undefined
  }

  const customFields: Record<string, unknown> = {}

  for (const key of Object.keys(block)) {
    if (
      key === '_type' ||
      key === '_key' ||
      key === 'children' ||
      key === 'markDefs' ||
      key === 'style' ||
      key === 'listItem' ||
      key === 'level'
    ) {
      continue
    }

    if (options.validateFields) {
      if (scope.blockCustomFields.includes(key)) {
        customFields[key] = block[key]
      }
    } else {
      customFields[key] = block[key]
    }
  }

  const _key =
    typeof block['_key'] === 'string' ? block['_key'] : context.keyGenerator()

  const {markDefs, markDefKeyMap} = parseMarkDefsInScope({
    context,
    scope,
    markDefs: block['markDefs'],
    options,
  })

  const unparsedChildren: Array<unknown> = Array.isArray(block['children'])
    ? block['children']
    : []

  const parsedChildren = unparsedChildren
    .map((child) =>
      parseChildInScope({child, context, scope, markDefKeyMap, options}),
    )
    .filter((child) => child !== undefined)
  const marks = parsedChildren.flatMap((child) => child.marks ?? [])

  const children =
    parsedChildren.length > 0
      ? parsedChildren
      : [
          {
            _key: context.keyGenerator(),
            _type: scope.span.name,
            text: '',
            marks: [],
          },
        ]

  const normalizedChildren = options.normalize
    ? // Ensure that inline objects re surrounded by spans
      children.reduce<Array<PortableTextObject | PortableTextSpan>>(
        (normalizedChildren, child, index) => {
          if (isSpan(context, child)) {
            return [...normalizedChildren, child]
          }

          const previousChild = normalizedChildren.at(-1)

          if (!previousChild || !isSpan(context, previousChild)) {
            return [
              ...normalizedChildren,
              {
                _key: context.keyGenerator(),
                _type: scope.span.name,
                text: '',
                marks: [],
              },
              child,
              ...(index === children.length - 1
                ? [
                    {
                      _key: context.keyGenerator(),
                      _type: scope.span.name,
                      text: '',
                      marks: [],
                    },
                  ]
                : []),
            ]
          }

          return [...normalizedChildren, child]
        },
        [],
      )
    : children

  const parsedBlock: PortableTextTextBlock = {
    _type: scope.block.name,
    _key,
    children: normalizedChildren,
    ...customFields,
  }

  if (typeof block['markDefs'] === 'object' && block['markDefs'] !== null) {
    parsedBlock.markDefs = options.removeUnusedMarkDefs
      ? markDefs.filter((markDef) => marks.includes(markDef._key))
      : markDefs
  }

  if (
    typeof block['style'] === 'string' &&
    scope.styles.find((style) => style.name === block['style'])
  ) {
    parsedBlock.style = block['style']
  }

  if (
    typeof block['listItem'] === 'string' &&
    scope.lists.find((list) => list.name === block['listItem'])
  ) {
    parsedBlock.listItem = block['listItem']
  }

  if (typeof block['level'] === 'number') {
    parsedBlock.level = block['level']
  }

  return parsedBlock
}

function parseMarkDefsInScope({
  context,
  scope,
  markDefs,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  markDefs: unknown
  options: {validateFields: boolean}
}): {
  markDefs: Array<PortableTextObject>
  markDefKeyMap: Map<string, string>
} {
  const unparsedMarkDefs: Array<unknown> = Array.isArray(markDefs)
    ? markDefs
    : []
  const markDefKeyMap = new Map<string, string>()

  const parsedMarkDefs = unparsedMarkDefs.flatMap((markDef) => {
    if (!isTypedObject(markDef)) {
      return []
    }

    const schemaType = scope.annotations.find(
      ({name}) => name === markDef._type,
    )

    if (!schemaType) {
      return []
    }

    if (typeof markDef['_key'] !== 'string') {
      // If the `markDef` doesn't have a `_key` then we don't know what spans
      // it belongs to and therefore we have to discard it.
      return []
    }

    const parsedAnnotation = parseObject({
      object: markDef,
      context,
      schemaType,
      options,
    })

    if (!parsedAnnotation) {
      return []
    }

    markDefKeyMap.set(markDef['_key'], parsedAnnotation._key)

    return [parsedAnnotation]
  })

  return {
    markDefs: parsedMarkDefs,
    markDefKeyMap,
  }
}

function parseChildInScope({
  child,
  context,
  scope,
  markDefKeyMap,
  options,
}: {
  child: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | PortableTextObject | undefined {
  return (
    parseSpanInScope({span: child, context, scope, markDefKeyMap, options}) ??
    parseInlineObjectInScope({
      inlineObject: child,
      context,
      scope,
      options,
    })
  )
}

function parseSpanInScope({
  span,
  context,
  scope,
  markDefKeyMap,
  options,
}: {
  span: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | undefined {
  if (!isRecord(span)) {
    return undefined
  }

  const customFields: Record<string, unknown> = {}

  for (const key of Object.keys(span)) {
    if (
      key !== '_type' &&
      key !== '_key' &&
      key !== 'text' &&
      key !== 'marks'
    ) {
      customFields[key] = span[key]
    }
  }

  const unparsedMarks: Array<unknown> = Array.isArray(span['marks'])
    ? span['marks']
    : []
  const marks = unparsedMarks.flatMap((mark) => {
    if (typeof mark !== 'string') {
      return []
    }

    const markDefKey = markDefKeyMap.get(mark)

    if (markDefKey !== undefined) {
      return [markDefKey]
    }

    if (scope.decorators.some((decorator) => decorator.name === mark)) {
      return [mark]
    }

    return []
  })

  if (typeof span['_type'] === 'string' && span['_type'] !== scope.span.name) {
    return undefined
  }

  if (typeof span['_type'] !== 'string') {
    if (typeof span['text'] === 'string') {
      return {
        _type: scope.span.name as 'span',
        _key:
          typeof span['_key'] === 'string'
            ? span['_key']
            : context.keyGenerator(),
        text: span['text'],
        marks,
        ...(options.validateFields ? {} : customFields),
      }
    }

    return undefined
  }

  return {
    _type: scope.span.name as 'span',
    _key:
      typeof span['_key'] === 'string' ? span['_key'] : context.keyGenerator(),
    text: typeof span['text'] === 'string' ? span['text'] : '',
    marks,
    ...(options.validateFields ? {} : customFields),
  }
}

function parseInlineObjectInScope({
  inlineObject,
  context,
  scope,
  options,
}: {
  inlineObject: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  scope: BlockScope
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(inlineObject)) {
    return undefined
  }

  const schemaType = scope.inlineObjects.find(
    ({name}) => name === inlineObject._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: inlineObject,
    context,
    schemaType,
    options,
  })
}

export function parseAnnotation({
  annotation,
  context,
  options,
}: {
  annotation: TypedObject
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(annotation)) {
    return undefined
  }

  const schemaType = context.schema.annotations.find(
    ({name}) => name === annotation._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: annotation,
    context,
    schemaType,
    options,
  })
}

/**
 * Parse an object against a `{name, fields}` schema type. Validates top-level
 * fields and recurses into any array field whose `of` contains a block-like
 * member -- parsing the nested blocks against a child `BlockScope` built from
 * that `of`.
 */
function parseObject({
  object,
  context,
  schemaType,
  options,
}: {
  object: TypedObject
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  schemaType: {
    name: string
    fields: ReadonlyArray<{
      name: string
      type: string
      of?: ReadonlyArray<OfDefinition>
    }>
  }
  options: {validateFields: boolean}
}): PortableTextObject {
  const {_key, ...customFields} = object

  const fieldsByName = new Map(
    schemaType.fields.map((field) => [field.name, field]),
  )

  const values: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(customFields)) {
    if (key === '_type') {
      continue
    }

    const field = fieldsByName.get(key)

    if (options.validateFields && !field) {
      continue
    }

    if (field && field.type === 'array' && field.of && Array.isArray(value)) {
      values[key] = parseContainerFieldValue({
        context,
        of: field.of,
        value,
        options,
      })
      continue
    }

    values[key] = value
  }

  return {
    _type: schemaType.name,
    _key: typeof _key === 'string' ? _key : context.keyGenerator(),
    ...values,
  }
}

/**
 * Parse the value of an array field whose `of` declares what's allowed at
 * that position. If any member is `{type: 'block'}`, the field is a PTE
 * container: recurse via `parseBlocks` in a child `BlockScope`. Otherwise it
 * is an opaque array of non-PTE members (rows, cells, scalars, objects that
 * happen to sit between containers and the actual text blocks) -- recurse
 * into each member object so nested PTE arrays further down are still
 * reached.
 */
function parseContainerFieldValue({
  context,
  of,
  value,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  of: ReadonlyArray<OfDefinition>
  value: ReadonlyArray<unknown>
  options: {validateFields: boolean; normalize?: boolean}
}): Array<unknown> {
  const hasBlockMember = of.some((member) => member.type === 'block')

  if (hasBlockMember) {
    const scope = childBlockScope(context.schema, of)
    return value.flatMap((block) => {
      const parsed = parseBlockInScope({
        context,
        scope,
        block,
        options: {
          normalize: false,
          removeUnusedMarkDefs: false,
          validateFields: options.validateFields,
        },
      })
      return parsed ? [parsed] : []
    })
  }

  // Non-PTE array: recurse into object members so any deeper PTE arrays
  // (e.g. `table.rows[].cells[].content`) still get parsed.
  return value.flatMap((item) => {
    if (!isTypedObject(item)) {
      return [item]
    }
    const member = of.find(
      (entry) => entry.type !== 'block' && entry.type === item._type,
    )
    if (!member || member.type === 'block' || !('fields' in member)) {
      return [item]
    }
    return [
      parseObject({
        object: item,
        context,
        schemaType: {
          name: member.type,
          fields: (member.fields ?? []) as ReadonlyArray<{
            name: string
            type: string
            of?: ReadonlyArray<OfDefinition>
          }>,
        },
        options,
      }),
    ]
  })
}
