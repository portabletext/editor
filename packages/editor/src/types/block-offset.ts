import type {KeyedSegment} from '@sanity/types'

/**
 * @beta
 */
export type BlockOffset = {
  path: [KeyedSegment]
  offset: number
}
