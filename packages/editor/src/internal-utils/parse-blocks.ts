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
import {isTypedObject} from './asserters'

export function parseBlocks({
  context,
  blocks,
  options,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  blocks: unknown
  options: {
    refreshKeys: boolean
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
    refreshKeys: boolean
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
  options: {refreshKeys: boolean; validateFields: boolean}
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

export function isTextBlock(
  context: Pick<EditorContext, 'schema'>,
  block: unknown,
): block is PortableTextTextBlock {
  if (!isTypedObject(block)) {
    return false
  }

  if (block._type !== context.schema.block.name) {
    return false
  }

  if (!Array.isArray(block.children)) {
    return false
  }

  return true
}

export function parseTextBlock({
  block,
  context,
  options,
}: {
  block: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {refreshKeys: boolean; validateFields: boolean}
}): PortableTextTextBlock | undefined {
  if (!isTypedObject(block)) {
    return undefined
  }

  const customFields: Record<string, unknown> = {}

  for (const key of Object.keys(block)) {
    if (
      key !== '_type' &&
      key !== '_key' &&
      key !== 'children' &&
      key !== 'markDefs' &&
      key !== 'style' &&
      key !== 'listItem' &&
      key !== 'level'
    ) {
      customFields[key] = block[key]
    }
  }

  if (block._type !== context.schema.block.name) {
    return undefined
  }

  const _key = options.refreshKeys
    ? context.keyGenerator()
    : typeof block._key === 'string'
      ? block._key
      : context.keyGenerator()

  const unparsedMarkDefs: Array<unknown> = Array.isArray(block.markDefs)
    ? block.markDefs
    : []
  const markDefKeyMap = new Map<string, string>()
  const markDefs = unparsedMarkDefs.flatMap((markDef) => {
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

  const unparsedChildren: Array<unknown> = Array.isArray(block.children)
    ? block.children
    : []

  const children = unparsedChildren
    .map(
      (child) =>
        parseSpan({span: child, context, markDefKeyMap, options}) ??
        parseInlineObject({inlineObject: child, context, options}),
    )
    .filter((child) => child !== undefined)

  const parsedBlock: PortableTextTextBlock = {
    _type: context.schema.block.name,
    _key,
    children:
      children.length > 0
        ? children
        : [
            {
              _key: context.keyGenerator(),
              _type: context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
    markDefs,
    ...(options.validateFields ? {} : customFields),
  }

  if (
    typeof block.style === 'string' &&
    context.schema.styles.find((style) => style.name === block.style)
  ) {
    parsedBlock.style = block.style
  } else {
    const defaultStyle = context.schema.styles.at(0)?.name

    if (defaultStyle !== undefined) {
      parsedBlock.style = defaultStyle
    } else {
      console.error('Expected default style')
    }
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

export function isSpan(
  context: Pick<EditorContext, 'schema'>,
  child: unknown,
): child is PortableTextSpan {
  if (!isTypedObject(child)) {
    return false
  }

  if (child._type !== context.schema.span.name) {
    return false
  }

  if (typeof child.text !== 'string') {
    return false
  }

  return true
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
  options: {refreshKeys: boolean; validateFields: boolean}
}): PortableTextSpan | undefined {
  if (!isTypedObject(span)) {
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

  // In reality, the span schema name is always 'span', but we only the check here anyway
  if (span._type !== context.schema.span.name || span._type !== 'span') {
    return undefined
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

  return {
    _type: 'span',
    _key: options.refreshKeys
      ? context.keyGenerator()
      : typeof span._key === 'string'
        ? span._key
        : context.keyGenerator(),
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
  options: {refreshKeys: boolean; validateFields: boolean}
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
  options: {refreshKeys: boolean; validateFields: boolean}
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
  options: {refreshKeys: boolean; validateFields: boolean}
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
    _key: options.refreshKeys
      ? context.keyGenerator()
      : typeof object._key === 'string'
        ? object._key
        : context.keyGenerator(),
    ...values,
  }
}
