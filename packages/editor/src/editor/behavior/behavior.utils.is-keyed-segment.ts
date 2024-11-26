import type {KeyedSegment, PathSegment} from '@sanity/types'

export function isKeyedSegment(segment: PathSegment): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
