import type {EditorSchema} from '../editor/editor-schema'
import {isTypedObject} from '../utils/asserters'

type Path = Array<number>

export type PortableTextNode<TEditorSchema extends EditorSchema> =
  | EditorNode<TEditorSchema>
  | TextBlockNode<TEditorSchema>
  | SpanNode<TEditorSchema>
  | PartialSpanNode
  | ObjectNode

//////////

export type EditorNode<TEditorSchema extends EditorSchema> = {
  children: Array<TextBlockNode<TEditorSchema> | ObjectNode>
}

export function isEditorNode<TEditorSchema extends EditorSchema>(
  node: unknown,
): node is EditorNode<TEditorSchema> {
  if (typeof node === 'object' && node !== null) {
    return (
      !('_type' in node) && 'children' in node && Array.isArray(node.children)
    )
  }

  return false
}

//////////

export type TextBlockNode<TEditorSchema extends EditorSchema> = {
  _key?: string
  _type: TEditorSchema['block']['name']
  children: Array<SpanNode<TEditorSchema> | ObjectNode>
  [other: string]: unknown
}

export function isTextBlockNode<TEditorSchema extends EditorSchema>(
  context: {schema: TEditorSchema},
  node: unknown,
): node is TextBlockNode<TEditorSchema> {
  return isTypedObject(node) && node._type === context.schema.block.name
}

//////////

export type SpanNode<TEditorSchema extends EditorSchema> = {
  _key?: string
  _type?: TEditorSchema['span']['name']
  text: string
  [other: string]: unknown
}

export function isSpanNode<TEditorSchema extends EditorSchema>(
  context: {schema: TEditorSchema},
  node: unknown,
): node is SpanNode<TEditorSchema> {
  if (typeof node !== 'object' || node === null) {
    return false
  }

  if ('children' in node) {
    return false
  }

  if ('_type' in node) {
    return node._type === context.schema.span.name
  }

  return 'text' in node
}

//////////

export type PartialSpanNode = {
  text: string
  [other: string]: unknown
}

export function isPartialSpanNode(
  context: {schema: EditorSchema},
  node: unknown,
): node is PartialSpanNode {
  if (typeof node !== 'object' || node === null) {
    return false
  }

  if (!('text' in node) || typeof node.text !== 'string') {
    return false
  }

  if ('_type' in node && node._type !== context.schema.span.name) {
    return false
  }

  return true
}

//////////

export type ObjectNode = {
  _type: string
  _key: string
  [other: string]: unknown
}

export function isObjectNode(
  context: {schema: EditorSchema},
  node: unknown,
): node is ObjectNode {
  return (
    !isEditorNode(node) &&
    !isTextBlockNode(context, node) &&
    !isSpanNode(context, node) &&
    !isPartialSpanNode(context, node)
  )
}

/**
 *
 */
export function getBlock<TEditorSchema extends EditorSchema>(
  root: EditorNode<TEditorSchema>,
  path: Path,
): TextBlockNode<TEditorSchema> | ObjectNode | undefined {
  const index = path.at(0)

  if (index === undefined || path.length !== 1) {
    return undefined
  }

  return root.children.at(index)
}

/**
 * Walk the tree to find the node at the given path.
 * Supports arbitrary depth for nested blocks (containers).
 */
export function getNode<TEditorSchema extends EditorSchema>(
  _context: {schema: TEditorSchema},
  root: EditorNode<TEditorSchema>,
  path: Path,
): PortableTextNode<TEditorSchema> | undefined {
  if (path.length === 0) {
    return root
  }

  // biome-ignore lint/suspicious/noExplicitAny: walking a heterogeneous tree
  let current: any = root

  for (const index of path) {
    if (
      !current ||
      !('children' in current) ||
      !Array.isArray(current.children)
    ) {
      return undefined
    }

    current = current.children[index]
  }

  return current as PortableTextNode<TEditorSchema> | undefined
}

export function getSpan<TEditorSchema extends EditorSchema>(
  context: {schema: TEditorSchema},
  root: EditorNode<TEditorSchema>,
  path: Path,
) {
  const node = getNode(context, root, path)

  if (node && isSpanNode(context, node)) {
    return node
  }

  return undefined
}

/**
 * Get the parent node for the given path.
 * Supports arbitrary depth for nested blocks (containers).
 */
export function getParent<TEditorSchema extends EditorSchema>(
  context: {schema: TEditorSchema},
  root: EditorNode<TEditorSchema>,
  path: Path,
) {
  if (path.length === 0) {
    return undefined
  }

  const parentPath = path.slice(0, -1)
  return getNode(context, root, parentPath)
}
