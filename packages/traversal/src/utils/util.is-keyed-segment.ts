import type {KeyedSegment} from '../types/paths'

/**
 * @public
 */
export function isKeyedSegment(segment: unknown): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
