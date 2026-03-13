import type {
  PortableTextBlock,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Descendant} from '../slate'
import {isElement} from '../slate/element/is-element'
import {isText} from '../slate/text/is-text'
import {isEqualValues} from './equality'

export function toSlateBlock(
  block: PortableTextBlock,
  {schemaTypes}: {schemaTypes: EditorSchema},
): Descendant {
  const {_type, _key, ...rest} = block
  const isPortableText = block && block._type === schemaTypes.block.name

  if (isPortableText) {
    const textBlock = block as PortableTextTextBlock
    let hasInlines = false
    const hasMissingMarkDefs = typeof textBlock.markDefs === 'undefined'
    const hasMissingChildren = typeof textBlock.children === 'undefined'

    const children = (textBlock.children || []).map((child) => {
      const {_type: childType, _key: childKey, ...childProps} = child
      const propKeys = Object.keys(childProps)

      if (childType === undefined) {
        if (propKeys.length === 1 && propKeys.at(0) === 'text') {
          return {
            _key: childKey,
            _type: schemaTypes.span.name,
            text: childProps.text,
          }
        }
      }

      if (childType !== schemaTypes.span.name) {
        hasInlines = true

        return {
          _type: childType,
          _key: childKey,
          ...childProps,
        }
      }

      // Original child object (span)
      return child
    })

    // Return original block
    if (
      !hasMissingMarkDefs &&
      !hasMissingChildren &&
      !hasInlines &&
      isElement(block, schemaTypes)
    ) {
      // Original object
      return block
    }

    return {_type, _key, ...rest, children} as Descendant
  }

  const {children: _originalChildren, ...blockObjectProps} = rest

  return {
    _type,
    _key,
    ...blockObjectProps,
  } as Descendant
}

export function isEqualToEmptyEditor(
  initialValue: Array<PortableTextBlock> | undefined,
  blocks: Array<Descendant> | Array<PortableTextBlock>,
  schemaTypes: EditorSchema,
): boolean {
  if (!blocks) {
    return false
  }

  // Must have exactly one block
  if (blocks.length !== 1) {
    return false
  }

  const firstBlock = blocks.at(0)

  if (!firstBlock) {
    return true
  }

  if (!isElement(firstBlock, schemaTypes)) {
    return false
  }

  // Must be a text block
  if (firstBlock._type !== schemaTypes.block.name) {
    return false
  }

  // Must not be a list item
  if ('listItem' in firstBlock) {
    return false
  }

  // Style must exist and be the default style
  if (
    !('style' in firstBlock) ||
    firstBlock.style !== schemaTypes.styles.at(0)?.name
  ) {
    return false
  }

  // Must have children array
  if (!Array.isArray(firstBlock.children)) {
    return false
  }

  // Must have exactly one child
  if (firstBlock.children.length !== 1) {
    return false
  }

  const firstChild = firstBlock.children.at(0)

  if (!firstChild) {
    return false
  }

  if (!isText(firstChild, schemaTypes)) {
    return false
  }

  // Must be a span type
  if (!('_type' in firstChild) || firstChild._type !== schemaTypes.span.name) {
    return false
  }

  // Must have empty text
  if (firstChild.text !== '') {
    return false
  }

  // Must have no marks (marks can be undefined or empty array)
  if (firstChild.marks?.join('')) {
    return false
  }

  // Must have empty markDefs (or no markDefs)
  if (
    'markDefs' in firstBlock &&
    Array.isArray(firstBlock.markDefs) &&
    firstBlock.markDefs.length > 0
  ) {
    return false
  }

  if (
    Object.keys(firstBlock).some(
      (key) =>
        key !== '_type' &&
        key !== '_key' &&
        key !== 'children' &&
        key !== 'markDefs' &&
        key !== 'style',
    )
  ) {
    return false
  }

  if (isEqualValues({schema: schemaTypes}, initialValue, [firstBlock])) {
    return false
  }

  return true
}
