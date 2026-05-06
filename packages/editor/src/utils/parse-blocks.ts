import {
  getSubSchema,
  isSpan,
  isTextBlock,
  type OfDefinition,
  type PortableTextBlock,
  type PortableTextListBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
  type Schema,
  type TypedObject,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {isRecord, isTypedObject} from './asserters'

export function parseBlocks({
  schema,
  keyGenerator,
  blocks,
  options,
}: {
  schema: Schema
  keyGenerator: () => string
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

  return blocks.flatMap((block) => {
    const parsedBlock = parseBlockInternal({
      schema,
      keyGenerator,
      block,
      options,
    })

    return parsedBlock ? [parsedBlock] : []
  })
}

export function parseBlock({
  schema,
  keyGenerator,
  block,
  options,
}: {
  schema: Schema
  keyGenerator: () => string
  block: unknown
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextBlock | undefined {
  return parseBlockInternal({schema, keyGenerator, block, options})
}

export function parseSpan({
  span,
  schema,
  keyGenerator,
  markDefKeyMap,
  options,
}: {
  span: unknown
  schema: Schema
  keyGenerator: () => string
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | undefined {
  return parseSpanInternal({span, schema, keyGenerator, markDefKeyMap, options})
}

export function parseInlineObject({
  inlineObject,
  schema,
  keyGenerator,
  options,
}: {
  inlineObject: unknown
  schema: Schema
  keyGenerator: () => string
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  return parseInlineObjectInternal({
    inlineObject,
    schema,
    keyGenerator,
    options,
  })
}

export function parseChild({
  child,
  schema,
  keyGenerator,
  markDefKeyMap,
  options,
}: {
  child: unknown
  schema: Schema
  keyGenerator: () => string
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | PortableTextObject | undefined {
  return parseChildInternal({
    child,
    schema,
    keyGenerator,
    markDefKeyMap,
    options,
  })
}

export function parseMarkDefs({
  schema,
  keyGenerator,
  markDefs,
  options,
}: {
  schema: Schema
  keyGenerator: () => string
  markDefs: unknown
  options: {validateFields: boolean}
}): {
  markDefs: Array<PortableTextObject>
  markDefKeyMap: Map<string, string>
} {
  return parseMarkDefsInternal({schema, keyGenerator, markDefs, options})
}

function parseBlockInternal({
  schema,
  keyGenerator,
  block,
  options,
}: {
  schema: Schema
  keyGenerator: () => string
  block: unknown
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextBlock | undefined {
  return (
    parseTextBlock({block, schema, keyGenerator, options}) ??
    parseBlockObject({blockObject: block, schema, keyGenerator, options})
  )
}

function parseBlockObject({
  blockObject,
  schema,
  keyGenerator,
  options,
}: {
  blockObject: unknown
  schema: Schema
  keyGenerator: () => string
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(blockObject)) {
    return undefined
  }

  const schemaType = schema.blockObjects.find(
    ({name}) => name === blockObject._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: blockObject,
    schema,
    keyGenerator,
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
  schema,
  keyGenerator,
  options,
}: {
  block: unknown
  schema: Schema
  keyGenerator: () => string
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextTextBlock | undefined {
  if (!isTypedObject(block)) {
    return undefined
  }

  if (block._type !== schema.block.name) {
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
      if ((schema.block.fields ?? []).some((f) => f.name === key)) {
        customFields[key] = block[key]
      }
    } else {
      customFields[key] = block[key]
    }
  }

  const _key =
    typeof block['_key'] === 'string' ? block['_key'] : keyGenerator()

  const {markDefs, markDefKeyMap} = parseMarkDefsInternal({
    schema,
    keyGenerator,
    markDefs: block['markDefs'],
    options,
  })

  const unparsedChildren: Array<unknown> = Array.isArray(block['children'])
    ? block['children']
    : []

  const parsedChildren = unparsedChildren
    .map((child) =>
      parseChildInternal({child, schema, keyGenerator, markDefKeyMap, options}),
    )
    .filter((child) => child !== undefined)
  const marks = parsedChildren.flatMap((child) => child.marks ?? [])

  const children =
    parsedChildren.length > 0
      ? parsedChildren
      : [
          {
            _key: keyGenerator(),
            _type: schema.span.name,
            text: '',
            marks: [],
          },
        ]

  const normalizedChildren = options.normalize
    ? // Ensure that inline objects re surrounded by spans
      children.reduce<Array<PortableTextObject | PortableTextSpan>>(
        (normalizedChildren, child, index) => {
          if (isSpan({schema}, child)) {
            return [...normalizedChildren, child]
          }

          const previousChild = normalizedChildren.at(-1)

          if (!previousChild || !isSpan({schema}, previousChild)) {
            return [
              ...normalizedChildren,
              {
                _key: keyGenerator(),
                _type: schema.span.name,
                text: '',
                marks: [],
              },
              child,
              ...(index === children.length - 1
                ? [
                    {
                      _key: keyGenerator(),
                      _type: schema.span.name,
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
    _type: schema.block.name,
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
    schema.styles.find((style) => style.name === block['style'])
  ) {
    parsedBlock.style = block['style']
  }

  if (
    typeof block['listItem'] === 'string' &&
    schema.lists.find((list) => list.name === block['listItem'])
  ) {
    parsedBlock.listItem = block['listItem']
  }

  if (typeof block['level'] === 'number') {
    parsedBlock.level = block['level']
  }

  return parsedBlock
}

function parseMarkDefsInternal({
  schema,
  keyGenerator,
  markDefs,
  options,
}: {
  schema: Schema
  keyGenerator: () => string
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

    const schemaType = schema.annotations.find(
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
      schema,
      keyGenerator,
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

function parseChildInternal({
  child,
  schema,
  keyGenerator,
  markDefKeyMap,
  options,
}: {
  child: unknown
  schema: Schema
  keyGenerator: () => string
  markDefKeyMap: Map<string, string>
  options: {validateFields: boolean}
}): PortableTextSpan | PortableTextObject | undefined {
  return (
    parseSpanInternal({
      span: child,
      schema,
      keyGenerator,
      markDefKeyMap,
      options,
    }) ??
    parseInlineObjectInternal({
      inlineObject: child,
      schema,
      keyGenerator,
      options,
    })
  )
}

function parseSpanInternal({
  span,
  schema,
  keyGenerator,
  markDefKeyMap,
  options,
}: {
  span: unknown
  schema: Schema
  keyGenerator: () => string
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

    if (schema.decorators.some((decorator) => decorator.name === mark)) {
      return [mark]
    }

    return []
  })

  if (typeof span['_type'] === 'string' && span['_type'] !== schema.span.name) {
    return undefined
  }

  if (typeof span['_type'] !== 'string') {
    if (typeof span['text'] === 'string') {
      return {
        _type: schema.span.name as 'span',
        _key: typeof span['_key'] === 'string' ? span['_key'] : keyGenerator(),
        text: span['text'],
        marks,
        ...(options.validateFields ? {} : customFields),
      }
    }

    return undefined
  }

  return {
    _type: schema.span.name as 'span',
    _key: typeof span['_key'] === 'string' ? span['_key'] : keyGenerator(),
    text: typeof span['text'] === 'string' ? span['text'] : '',
    marks,
    ...(options.validateFields ? {} : customFields),
  }
}

function parseInlineObjectInternal({
  inlineObject,
  schema,
  keyGenerator,
  options,
}: {
  inlineObject: unknown
  schema: Schema
  keyGenerator: () => string
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(inlineObject)) {
    return undefined
  }

  const schemaType = schema.inlineObjects.find(
    ({name}) => name === inlineObject._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: inlineObject,
    schema,
    keyGenerator,
    schemaType,
    options,
  })
}

export function parseAnnotation({
  annotation,
  schema,
  keyGenerator,
  options,
}: {
  annotation: TypedObject
  schema: Schema
  keyGenerator: () => string
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(annotation)) {
    return undefined
  }

  const schemaType = schema.annotations.find(
    ({name}) => name === annotation._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: annotation,
    schema,
    keyGenerator,
    schemaType,
    options,
  })
}

/**
 * Parse an object against a `{name, fields}` schema type. Validates top-level
 * fields and recurses into any array field whose `of` contains a block-like
 * member -- parsing the nested blocks against a child `Schema` built from
 * that `of`.
 */
function parseObject({
  object,
  schema,
  keyGenerator,
  schemaType,
  options,
}: {
  object: TypedObject
  schema: Schema
  keyGenerator: () => string
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
        schema,
        keyGenerator,
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
    _key: typeof _key === 'string' ? _key : keyGenerator(),
    ...values,
  }
}

/**
 * Parse the value of an array field whose `of` declares what's allowed at
 * that position. If any member is `{type: 'block'}`, the field is a PTE
 * container: recurse via `parseBlocks` in a child `Schema`. Otherwise it
 * is an opaque array of non-PTE members (rows, cells, scalars, objects that
 * happen to sit between containers and the actual text blocks) -- recurse
 * into each member object so nested PTE arrays further down are still
 * reached.
 */
function parseContainerFieldValue({
  schema,
  keyGenerator,
  of,
  value,
  options,
}: {
  schema: Schema
  keyGenerator: () => string
  of: ReadonlyArray<OfDefinition>
  value: ReadonlyArray<unknown>
  options: {validateFields: boolean; normalize?: boolean}
}): Array<unknown> {
  const hasBlockMember = of.some((member) => member.type === 'block')

  if (hasBlockMember) {
    const childSubSchema = getSubSchema(schema, of)
    return value.flatMap((block) => {
      const parsed = parseBlockInternal({
        schema: childSubSchema,
        keyGenerator,
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
        schema,
        keyGenerator,
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
