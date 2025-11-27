import {isSpan, isTextBlock} from '@portabletext/schema'
import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  TypedObject,
} from '@sanity/types'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {isRecord, isTypedObject} from './asserters'

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

  return blocks.flatMap((block) => {
    const parsedBlock = parseBlock({context, block, options})

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
  return (
    parseTextBlock({block, context, options}) ??
    parseBlockObject({blockObject: block, context, options})
  )
}

export function parseBlockObject({
  blockObject,
  context,
  options,
}: {
  blockObject: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {validateFields: boolean}
}): PortableTextObject | undefined {
  if (!isTypedObject(blockObject)) {
    return undefined
  }

  const schemaType = context.schema.blockObjects.find(
    ({name}) => name === blockObject._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: blockObject,
    context: {
      keyGenerator: context.keyGenerator,
      schemaType,
    },
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

export function parseTextBlock({
  block,
  context,
  options,
}: {
  block: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {
    normalize: boolean
    removeUnusedMarkDefs: boolean
    validateFields: boolean
  }
}): PortableTextTextBlock | undefined {
  if (!isTypedObject(block)) {
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
      if (context.schema.block.fields?.some((field) => field.name === key)) {
        customFields[key] = block[key]
      }
    } else {
      customFields[key] = block[key]
    }
  }

  if (block._type !== context.schema.block.name) {
    return undefined
  }

  const _key =
    typeof block._key === 'string' ? block._key : context.keyGenerator()

  const {markDefs, markDefKeyMap} = parseMarkDefs({
    context,
    markDefs: block.markDefs,
    options,
  })

  const unparsedChildren: Array<unknown> = Array.isArray(block.children)
    ? block.children
    : []

  const parsedChildren = unparsedChildren
    .map((child) => parseChild({child, context, markDefKeyMap, options}))
    .filter((child) => child !== undefined)
  const marks = parsedChildren.flatMap((child) => child.marks ?? [])

  const children =
    parsedChildren.length > 0
      ? parsedChildren
      : [
          {
            _key: context.keyGenerator(),
            _type: context.schema.span.name,
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
                _type: context.schema.span.name,
                text: '',
                marks: [],
              },
              child,
              ...(index === children.length - 1
                ? [
                    {
                      _key: context.keyGenerator(),
                      _type: context.schema.span.name,
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
    _type: context.schema.block.name,
    _key,
    children: normalizedChildren,
    ...customFields,
  }

  if (typeof block.markDefs === 'object' && block.markDefs !== null) {
    parsedBlock.markDefs = options.removeUnusedMarkDefs
      ? markDefs.filter((markDef) => marks.includes(markDef._key))
      : markDefs
  }

  if (
    typeof block.style === 'string' &&
    context.schema.styles.find((style) => style.name === block.style)
  ) {
    parsedBlock.style = block.style
  }

  if (
    typeof block.listItem === 'string' &&
    context.schema.lists.find((list) => list.name === block.listItem)
  ) {
    parsedBlock.listItem = block.listItem
  }

  if (typeof block.level === 'number') {
    parsedBlock.level = block.level
  }

  return parsedBlock
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
  const unparsedMarkDefs: Array<unknown> = Array.isArray(markDefs)
    ? markDefs
    : []
  const markDefKeyMap = new Map<string, string>()

  const parsedMarkDefs = unparsedMarkDefs.flatMap((markDef) => {
    if (!isTypedObject(markDef)) {
      return []
    }

    const schemaType = context.schema.annotations.find(
      ({name}) => name === markDef._type,
    )

    if (!schemaType) {
      return []
    }

    if (typeof markDef._key !== 'string') {
      // If the `markDef` doesn't have a `_key` then we don't know what spans
      // it belongs to and therefore we have to discard it.
      return []
    }

    const parsedAnnotation = parseObject({
      object: markDef,
      context: {
        schemaType,
        keyGenerator: context.keyGenerator,
      },
      options,
    })

    if (!parsedAnnotation) {
      return []
    }

    markDefKeyMap.set(markDef._key, parsedAnnotation._key)

    return [parsedAnnotation]
  })

  return {
    markDefs: parsedMarkDefs,
    markDefKeyMap,
  }
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
  return (
    parseSpan({span: child, context, markDefKeyMap, options}) ??
    parseInlineObject({inlineObject: child, context, options})
  )
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

  const unparsedMarks: Array<unknown> = Array.isArray(span.marks)
    ? span.marks
    : []
  const marks = unparsedMarks.flatMap((mark) => {
    if (typeof mark !== 'string') {
      return []
    }

    const markDefKey = markDefKeyMap.get(mark)

    if (markDefKey !== undefined) {
      return [markDefKey]
    }

    if (
      context.schema.decorators.some((decorator) => decorator.name === mark)
    ) {
      return [mark]
    }

    return []
  })

  if (
    typeof span._type === 'string' &&
    span._type !== context.schema.span.name
  ) {
    return undefined
  }

  if (typeof span._type !== 'string') {
    if (typeof span.text === 'string') {
      return {
        _type: context.schema.span.name as 'span',
        _key:
          typeof span._key === 'string' ? span._key : context.keyGenerator(),
        text: span.text,
        marks,
        ...(options.validateFields ? {} : customFields),
      }
    }

    return undefined
  }

  return {
    _type: context.schema.span.name as 'span',
    _key: typeof span._key === 'string' ? span._key : context.keyGenerator(),
    text: typeof span.text === 'string' ? span.text : '',
    marks,
    ...(options.validateFields ? {} : customFields),
  }
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
  if (!isTypedObject(inlineObject)) {
    return undefined
  }

  const schemaType = context.schema.inlineObjects.find(
    ({name}) => name === inlineObject._type,
  )

  if (!schemaType) {
    return undefined
  }

  return parseObject({
    object: inlineObject,
    context: {
      keyGenerator: context.keyGenerator,
      schemaType,
    },
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
    context: {
      keyGenerator: context.keyGenerator,
      schemaType,
    },
    options,
  })
}

function parseObject({
  object,
  context,
  options,
}: {
  object: TypedObject
  context: Pick<EditorContext, 'keyGenerator'> & {
    schemaType: EditorSchema['blockObjects'][0]
  }
  options: {validateFields: boolean}
}): PortableTextObject {
  const {_type, _key, ...customFields} = object

  // Validates all props on the object and only takes those that match
  // the name of a field
  const values = options.validateFields
    ? context.schemaType.fields.reduce<Record<string, unknown>>(
        (fieldValues, field) => {
          const fieldValue = object[field.name]

          if (fieldValue !== undefined) {
            fieldValues[field.name] = fieldValue
          }

          return fieldValues
        },
        {},
      )
    : customFields

  return {
    _type: context.schemaType.name,
    _key:
      typeof object._key === 'string' ? object._key : context.keyGenerator(),
    ...values,
  }
}
