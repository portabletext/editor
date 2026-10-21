import type {Schema} from './schema'

/**
 * @public
 */
export interface TypedObject {
  [key: string]: unknown
  _type: string
}

/**
 * @public
 */
export function isTypedObject(object: unknown): object is TypedObject {
  return isRecord(object) && typeof object._type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

/**
 * @public
 */
export type PortableTextBlock = PortableTextTextBlock | PortableTextObject

/**
 * @public
 */
export interface PortableTextTextBlock<
  TChild = PortableTextSpan | PortableTextObject,
> {
  _type: string
  _key: string
  children: TChild[]
  markDefs?: PortableTextObject[]
  listItem?: string
  style?: string
  level?: number
}

/**
 * @public
 */
export function isTextBlock(
  context: {schema: Schema},
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

/**
 * Whether `node` is a text block in this schema, judged by `_type` alone.
 * Unlike `isTextBlock`, it doesn't require `children`, so it also matches
 * a text block whose `children` are missing.
 *
 * Only `_type` is checked. The narrowed type describes a well-formed text
 * block, so check `_key`, `children` and the other fields yourself before
 * relying on them in a value that may be malformed.
 *
 * @public
 */
export function isTextBlockNode(
  context: {schema: Schema},
  node: unknown,
): node is {
  _type: string
  _key: string
  children?: Array<PortableTextSpan | PortableTextObject>
  markDefs?: Array<PortableTextObject>
  style?: string
  listItem?: string
  level?: number
} {
  return isTypedObject(node) && node._type === context.schema.block.name
}

/**
 * @public
 */
export interface PortableTextSpan {
  _key: string
  _type: 'span'
  text: string
  marks?: string[]
}

/**
 * @public
 */
export function isSpan(
  context: {schema: Schema},
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

/**
 * Whether `node` is a span in this schema, judged by `_type` alone. Unlike
 * `isSpan`, it doesn't require `text`, so it also matches a span whose
 * `text` is missing.
 *
 * Only `_type` is checked. The narrowed type describes a well-formed span,
 * so check `_key`, `text` and `marks` yourself before relying on them in
 * a value that may be malformed.
 *
 * @public
 */
export function isSpanNode(
  context: {schema: Schema},
  node: unknown,
): node is {
  _type: string
  _key: string
  text?: string
  marks?: Array<string>
} {
  return isTypedObject(node) && node._type === context.schema.span.name
}

/**
 * @public
 */
export interface PortableTextObject {
  _type: string
  _key: string
  [other: string]: unknown
}

/**
 * @public
 */
export type PortableTextChild = PortableTextSpan | PortableTextObject

/**
 * @public
 */
export interface PortableTextListBlock extends PortableTextTextBlock {
  listItem: string
  level: number
}
