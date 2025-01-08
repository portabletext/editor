import type {KeyedSegment, PathSegment} from '@sanity/types'

/**
 * @public
 */
export function isKeyedSegment(segment: PathSegment): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
