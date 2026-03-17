import type {KeyedSegment} from '../types/paths'

/**
 * Deserialize a serialized keyed path.
 *
 * Assumes a structure where the path is always bookended keyed segments:
 *
 * - `k0` -> `[{_key: 'k0'}]`
 * - `k0.children.s0` -> `[{_key: 'k0'}, 'children', {_key: 's0'}]`
 * - `k0.children.s0.children.s1` -> `[{_key: 'k0'}, 'children', {_key: 's0'}, 'children', {_key: 's1'}]`
 */
export function deserializePath(
  serializedPath: string,
): Array<KeyedSegment | string> {
  const segments = serializedPath.split('.')

  const path: Array<KeyedSegment | string> = []

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]

    if (!segment) {
      continue
    }

    if (index % 2 === 0) {
      path.push({_key: segment})
    } else {
      path.push(segment)
    }
  }

  return path
}
