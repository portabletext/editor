import {
  isBlockChildrenObjectField,
  isBlockListObjectField,
  isBlockSchemaType,
  isBlockStyleObjectField,
  isTitledListValue,
  type ArraySchemaType,
  type BlockSchemaType,
  type EnumListProps,
  type SpanSchemaType,
} from '@sanity/types'
import {findBlockType} from './findBlockType'

export type PortableTextSchema = {
  block: {
    name: string
  }
  span: {
    name: string
  }
  styles: ReadonlyArray<{
    name: string
    title?: string
  }>
  lists: ReadonlyArray<{
    name: string
    title?: string
  }>
  decorators: ReadonlyArray<{
    name: string
    title?: string
  }>
  annotations: ReadonlyArray<{
    name: string
    title?: string
  }>
}

export function getPortableTextSchema(
  blockContentType: ArraySchemaType,
): PortableTextSchema {
  if (!blockContentType) {
    throw new Error("Parameter 'blockContentType' required")
  }

  const blockType = blockContentType.of.find(findBlockType)
  if (!isBlockSchemaType(blockType)) {
    throw new Error("'block' type is not defined in this schema (required).")
  }

  const ofType = blockType.fields.find(isBlockChildrenObjectField)?.type?.of
  if (!ofType) {
    throw new Error('No `of` declaration found for blocks `children` field')
  }

  const spanType = ofType.find(
    (member): member is SpanSchemaType => member.name === 'span',
  )
  if (!spanType) {
    throw new Error(
      'No `span` type found in `block` schema type `children` definition',
    )
  }

  const blockName = blockContentType.of.find(findBlockType)?.name

  if (!blockName) {
    throw new Error('No `block` type found in schema type')
  }

  return {
    styles: resolveEnabledStyles(blockType),
    decorators: resolveEnabledDecorators(spanType),
    annotations: resolveEnabledAnnotationTypes(spanType),
    lists: resolveEnabledListItems(blockType),
    block: {
      name: blockName,
    },
    span: {
      name: spanType.name,
    },
  }
}

function resolveEnabledStyles(blockType: BlockSchemaType): ReadonlyArray<{
  name: string
  title?: string
}> {
  const styleField = blockType.fields.find(isBlockStyleObjectField)
  if (!styleField) {
    throw new Error(
      "A field with name 'style' is not defined in the block type (required).",
    )
  }

  const textStyles = getTitledListValuesFromEnumListOptions(
    styleField.type.options,
  )
  if (textStyles.length === 0) {
    throw new Error(
      'The style fields need at least one style ' +
        "defined. I.e: {title: 'Normal', value: 'normal'}.",
    )
  }

  return textStyles
}

function resolveEnabledAnnotationTypes(
  spanType: SpanSchemaType,
): ReadonlyArray<{
  name: string
  title?: string
}> {
  return spanType.annotations.map((annotation) => ({
    name: annotation.name,
    title: annotation.title,
  }))
}

function resolveEnabledDecorators(spanType: SpanSchemaType): ReadonlyArray<{
  name: string
  title?: string
}> {
  return spanType.decorators.map((decorator) => ({
    name: decorator.value,
    title: decorator.title,
  }))
}

function resolveEnabledListItems(blockType: BlockSchemaType): ReadonlyArray<{
  name: string
  title?: string
}> {
  const listField = blockType.fields.find(isBlockListObjectField)
  if (!listField) {
    throw new Error(
      "A field with name 'list' is not defined in the block type (required).",
    )
  }

  const listItems = getTitledListValuesFromEnumListOptions(
    listField.type.options,
  )
  if (!listItems) {
    throw new Error('The list field need at least to be an empty array')
  }

  return listItems
}

function getTitledListValuesFromEnumListOptions(
  options: EnumListProps<string> | undefined,
): ReadonlyArray<{
  name: string
  title?: string
}> {
  const list = options ? options.list : undefined
  if (!Array.isArray(list)) {
    return []
  }

  return list.map((item) => {
    if (isTitledListValue(item)) {
      return {
        name: item.value ?? item.title,
        title: item.title,
      }
    }
    return {
      name: item,
    }
  })
}
