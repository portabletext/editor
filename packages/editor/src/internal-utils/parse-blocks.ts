import type {
  ObjectSchemaType,
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  TypedObject,
} from '@sanity/types'
import type {EditorSchema} from '../editor/define-schema'
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
  }
}): PortableTextBlock | undefined {
  return (
    parseTextBlock({block, context, options}) ??
    parseBlockObject({blockObject: block, context, options})
  )
}

function parseBlockObject({
  blockObject,
  context,
  options,
}: {
  blockObject: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {refreshKeys: boolean}
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

export function isTextBlock(
  schema: EditorSchema,
  block: unknown,
): block is PortableTextTextBlock {
  return (
    parseTextBlock({
      block,
      context: {schema, keyGenerator: () => ''},
      options: {refreshKeys: false},
    }) !== undefined
  )
}

function parseTextBlock({
  block,
  context,
  options,
}: {
  block: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {refreshKeys: boolean}
}): PortableTextTextBlock | undefined {
  if (!isTypedObject(block)) {
    return undefined
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
    // Spread the entire block to allow custom properties on it
    ...block,
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
  }

  /**
   * Reset text block .style if it's somehow set to an invalid type
   */
  if (
    typeof parsedBlock.style !== 'string' ||
    !context.schema.styles.find((style) => style.value === block.style)
  ) {
    const defaultStyle = context.schema.styles.at(0)?.value

    if (defaultStyle !== undefined) {
      parsedBlock.style = defaultStyle
    } else {
      delete parsedBlock.style
    }
  }

  /**
   * Reset text block .listItem if it's somehow set to an invalid type
   */
  if (
    typeof parsedBlock.listItem !== 'string' ||
    !context.schema.lists.find((list) => list.value === block.listItem)
  ) {
    delete parsedBlock.listItem
  }

  /**
   * Reset text block .level if it's somehow set to an invalid type
   */
  if (typeof parsedBlock.level !== 'number') {
    delete parsedBlock.level
  }

  return parsedBlock
}

export function isSpan(
  schema: EditorSchema,
  child: PortableTextSpan | PortableTextObject,
): child is PortableTextSpan {
  return (
    parseSpan({
      span: child,
      markDefKeyMap: new Map(),
      context: {schema, keyGenerator: () => ''},
      options: {refreshKeys: false},
    }) !== undefined
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
  options: {refreshKeys: boolean}
}): PortableTextSpan | undefined {
  if (!isTypedObject(span)) {
    return undefined
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
      context.schema.decorators.some((decorator) => decorator.value === mark)
    ) {
      return [mark]
    }

    return []
  })

  return {
    // Spread the entire span to allow custom properties on it
    ...span,
    _type: 'span',
    _key: options.refreshKeys
      ? context.keyGenerator()
      : typeof span._key === 'string'
        ? span._key
        : context.keyGenerator(),
    text: typeof span.text === 'string' ? span.text : '',
    marks,
  }
}

export function parseInlineObject({
  inlineObject,
  context,
  options,
}: {
  inlineObject: unknown
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  options: {refreshKeys: boolean}
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
  options: {refreshKeys: boolean}
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
  context: Pick<EditorContext, 'keyGenerator'> & {schemaType: ObjectSchemaType}
  options: {refreshKeys: boolean}
}): PortableTextObject {
  // Validates all props on the object and only takes those that match
  // the name of a field
  const values = context.schemaType.fields.reduce<Record<string, unknown>>(
    (fieldValues, field) => {
      const fieldValue = object[field.name]

      if (fieldValue !== undefined) {
        fieldValues[field.name] = object[field.name]
      }

      return fieldValues
    },
    {},
  )

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
