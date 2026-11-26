import type {Path} from '@portabletext/patches'
import {isKeyedSegment} from './is-keyed-segment'

/**
 * Returns true if `ancestor` is equal to `descendant`, or if `descendant`
 * lives anywhere inside `ancestor`'s subtree. The empty path contains every
 * path.
 *
 * Segments compare like in `pathEquals`: keyed segments by `_key`, numbers
 * and strings by identity. The comparison reads the paths only, so a keyed
 * segment never matches an index segment at the same position.
 *
 * @example
 * ```ts
 * import {pathContains} from '@portabletext/traversal'
 *
 * pathContains([{_key: 'b1'}], [{_key: 'b1'}, 'children', {_key: 's1'}]) // true
 * ```
 *
 * @public
 */
export function pathContains(ancestor: Path, descendant: Path): boolean {
  if (ancestor.length > descendant.length) {
    return false
  }

  for (let index = 0; index < ancestor.length; index++) {
    const segment = ancestor[index]
    const otherSegment = descendant[index]

    if (isKeyedSegment(segment) && isKeyedSegment(otherSegment)) {
      if (segment._key !== otherSegment._key) {
        return false
      }
    } else if (segment !== otherSegment) {
      return false
    }
  }

  return true
}
