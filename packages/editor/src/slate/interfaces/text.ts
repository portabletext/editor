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
}
