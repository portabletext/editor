import type {PortableTextSpan} from '@portabletext/schema'
import type {Range} from './range'

/**
 * `Text` objects represent the nodes that contain the actual text content of a
 * Slate document along with any formatting properties. They are always leaf
 * nodes in the document tree as they cannot contain any children.
 */

export interface BaseText {
  text: string
}

export type Text = PortableTextSpan

export interface LeafPosition {
  start: number
  end: number
  isFirst?: true
  isLast?: true
}

export interface TextEqualsOptions {
  loose?: boolean
}

export type DecoratedRange = Range & {
  merge?: (leaf: Text, decoration: object) => void
}
