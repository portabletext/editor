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
 * @public
 */
export interface PortableTextObject {
  _type: string
  _key: string
  [other: string]: unknown
}
