import type {KeyedSegment} from '@sanity/types'

/**
 * @public
 */
export function isKeyedSegment(segment: unknown): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
