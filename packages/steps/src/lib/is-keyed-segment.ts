import type {KeyedSegment} from '@portabletext/patches'

/**
 * A copy of `packages/editor/src/utils/util.is-keyed-segment.ts`, kept in
 * sync by hand.
 */
export function isKeyedSegment(segment: unknown): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
