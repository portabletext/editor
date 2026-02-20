import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Descendant} from '../slate'
import {isEqualValues} from './equality'

export const EMPTY_MARKDEFS: PortableTextObject[] = []

export const VOID_CHILD_KEY = 'void-child'

export function toSlateBlock(
  block: PortableTextBlock,
  {schemaTypes}: {schemaTypes: EditorSchema},
): Descendant {
  const {_type, _key, ...rest} = block
  const isPortableText = block && block._type === schemaTypes.block.name

  if (isPortableText) {
    const textBlock = block as PortableTextTextBlock
    let hasChanges = false
    const hasMissingMarkDefs = typeof textBlock.markDefs === 'undefined'
    const hasMissingChildren = typeof textBlock.children === 'undefined'

    const children = (textBlock.children || []).map((child) => {
      const {_type: childType, _key: childKey, ...childProps} = child

      if (childType === undefined) {
        const propKeys = Object.keys(childProps)
        if (propKeys.length === 1 && propKeys.at(0) === 'text') {
          hasChanges = true
          return {
            _key: childKey,
            _type: schemaTypes.span.name,
            text: childProps.text,
          }
        }
      }

      if (childType !== schemaTypes.span.name) {
        // Inline object: return directly as PT-shaped node (no children, value, or __inline)
        hasChanges = true
        return {
          _type: childType,
          _key: childKey,
          ...childProps,
        }
      }

      // Span: ensure marks is always present and text exists
      if (!child.marks || typeof child.text !== 'string') {
        hasChanges = true
        return {
          ...child,
          marks: child.marks ?? [],
          text: typeof child.text === 'string' ? child.text : '',
        }
      }

      // Original child object (span)
      return child
    })

    // Return original block if nothing changed
    if (
      !hasChanges &&
      !hasMissingMarkDefs &&
      !hasMissingChildren &&
      Array.isArray((block as any).children)
    ) {
      return block as unknown as Descendant
    }

    return {_type, _key, ...rest, children} as Descendant
  }

  // Block object: return directly as PT-shaped node (no children, value wrapper)
  return {_type, _key, ...rest} as Descendant
}

export function fromSlateBlock(block: Descendant, _textBlockType: string) {
  const {_key, _type} = block
  if (!_key || !_type) {
    throw new Error('Not a valid block')
  }
  // The tree is already PT-shaped — return as-is
  return block as PortableTextBlock
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

  if (!Array.isArray((firstBlock as any).children)) {
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

  if (typeof (firstChild as any).text !== 'string') {
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
