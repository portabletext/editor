import type {Path, PathSegment} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Serialize a path the way `toString` from `@sanity/util/paths` writes it.
 *
 * - `[{_key: 'k0'}]` -> `[_key=="k0"]`
 * - `[{_key: 'k0'}, 'children', {_key: 's0'}]` -> `[_key=="k0"].children[_key=="s0"]`
 * - `[{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}]` -> `[_key=="t0"].rows[_key=="r0"].cells[_key=="c0"].content[_key=="b0"].children[_key=="s0"]`
 * - `['body', 2]` -> `body[2]`
 * - `[{_key: 'k0'}, 'null']` -> `[_key=="k0"]["null"]`
 * - `['body', ['', 3]]` -> `body[:3]`
 */
export function serializePath(path: Path): string {
  return path.reduce<string>(
    (result, segment, index) =>
      result + serializePathSegment(segment, index === 0),
    '',
  )
}

/**
 * Serialize one segment. `head` is true for the first segment of a path, where
 * a field gets no leading `.` and `true`, `false` and `null` stay bare.
 */
export function serializePathSegment(
  segment: PathSegment,
  head: boolean,
): string {
  if (isKeyedSegment(segment)) {
    return `[_key=="${segment._key}"]`
  }
  if (typeof segment === 'number') {
    return `[${segment}]`
  }
  if (Array.isArray(segment)) {
    return `[${segment[0]}:${segment[1]}]`
  }
  if (
    !head &&
    (segment === 'true' || segment === 'false' || segment === 'null')
  ) {
    return `["${segment}"]`
  }
  const separator = head ? '' : '.'
  return `${separator}${segment}`
}
