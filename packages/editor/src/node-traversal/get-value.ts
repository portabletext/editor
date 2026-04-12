import type {PathSegment} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Walk a path on a plain JS value (arrays and objects) and return
 * whatever is found at the end. No schema awareness needed.
 */
export function getValue(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): unknown {
  let current: unknown = root

  for (const segment of path) {
    if (current === null || current === undefined) {
      return current
    }

    if (isKeyedSegment(segment)) {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current.find(
        (item: Record<string, unknown>) => item['_key'] === segment._key,
      )
    } else if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current[segment]
    } else if (typeof segment === 'string') {
      if (typeof current !== 'object' || current === null) {
        return undefined
      }
      current = (current as Record<string, unknown>)[segment]
    }
  }

  return current
}
