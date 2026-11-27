import type {KeyedSegment} from '@portabletext/patches'

/**
 * Returns true if `segment` is a keyed path segment: any non-null object with
 * a `_key` property, such as `{_key: 'b1'}`. Numbers, strings, `null`,
 * `undefined` and objects without a `_key` are not keyed segments.
 *
 * @example
 * ```ts
 * import {isKeyedSegment} from '@portabletext/traversal'
 *
 * isKeyedSegment({_key: 'b1'}) // true
 * isKeyedSegment('children') // false
 * ```
 *
 * @public
 */
export function isKeyedSegment(segment: unknown): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
