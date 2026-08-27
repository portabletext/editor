import type {PortableTextSpan} from '@portabletext/schema'
import type {Range} from './range'

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
  merge?: (leaf: PortableTextSpan, decoration: object) => void
  /**
   * Whether this (already per-child-clipped) decoration's own anchor/focus
   * point is the decoration's true, document-wide start/end point, as
   * opposed to a boundary introduced by clipping to this child. Set by
   * `splitDecorationsByChild`, consumed by `getTextDecorations` to derive
   * a fragment's `isFirst`/`isLast`.
   */
  isRangeStart?: boolean
  isRangeEnd?: boolean
}
