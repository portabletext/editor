import type {Path} from '@portabletext/patches'
import {arrayIndex, type ArrayKeyCache} from './array-index'
import {isRecord} from './is-record'

export function getValue(
  root: unknown,
  path: Path,
  cache?: ArrayKeyCache,
): unknown {
  let value = root
  for (const segment of path) {
    if (value === null || value === undefined) {
      return value
    }
    if (Array.isArray(value)) {
      value = value[arrayIndex(value, segment, cache)]
    } else {
      value =
        typeof segment === 'string' && isRecord(value)
          ? value[segment]
          : undefined
    }
  }
  return value
}
