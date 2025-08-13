import type {Schema} from '@portabletext/schema'
import {isArbitraryTypedObject} from './types'

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

export function isTextBlock(
  schema: Schema,
  block: unknown,
): block is PortableTextTextBlock {
  if (!isArbitraryTypedObject(block)) {
    return false
  }

  if (block._type !== schema.block.name) {
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

export function isSpan(
  schema: Schema,
  child: unknown,
): child is PortableTextSpan {
  if (!isArbitraryTypedObject(child)) {
    return false
  }

  if (child._type !== schema.span.name) {
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
