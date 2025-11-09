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
  _key: string
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

export function isNestedBlockNode<TEditorSchema extends EditorSchema>(
  context: {schema: TEditorSchema},
  node: unknown,
): node is TextBlockNode<TEditorSchema> {
  return (
    isTypedObject(node) &&
    context.schema.blocks.some((b) => b.name === node._type) &&
    'children' in node &&
    Array.isArray(node.children)
  )
}

//////////

export type SpanNode<TEditorSchema extends EditorSchema> = {
  _key: string
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

export function isPartialSpanNode(node: unknown): node is PartialSpanNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'text' in node &&
    typeof node.text === 'string'
  )
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
    !isPartialSpanNode(node)
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
 * A "node" can either be
 * 1. The root (path length is 0)
 * 2. A block (path length is 1)
 * 3. A span (path length is 2)
 * 4. Or an inline object (path length is 2)
 * 5. Or a nested block/span at any depth (path length > 2)
 */
export function getNode<TEditorSchema extends EditorSchema>(
  context: {schema: TEditorSchema},
  root: EditorNode<TEditorSchema>,
  path: Path,
): PortableTextNode<TEditorSchema> | undefined {
  if (path.length === 0) {
    return root
  }

  if (path.length === 1) {
    return getBlock(root, path)
  }

  // Navigate through nested structure
  let current: any = root

  for (let i = 0; i < path.length; i++) {
    const index = path[i]

    if (
      !current ||
      !('children' in current) ||
      !Array.isArray(current.children)
    ) {
      return undefined
    }

    current = current.children.at(index)

    if (current === undefined) {
      return undefined
    }
  }

  return current
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
 * A parent can either be the root, a text block, or a nested block
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

  if (parentPath.length === 0) {
    return root
  }

  // Navigate through nested structure without using getNode to avoid circular deps
  let current: any = root

  for (let i = 0; i < parentPath.length; i++) {
    const index = parentPath[i]

    if (
      !current ||
      !('children' in current) ||
      !Array.isArray(current.children)
    ) {
      return undefined
    }

    current = current.children.at(index)

    if (current === undefined) {
      return undefined
    }
  }

  return current
}
