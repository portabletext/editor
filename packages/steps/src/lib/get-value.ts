import type {Path} from '@portabletext/patches'
import {arrayIndex, isRecord} from './document'

export function getValue(root: unknown, path: Path): unknown {
  let value = root
  for (const segment of path) {
    if (value === null || value === undefined) {
      return value
    }
    if (Array.isArray(value)) {
      value = value[arrayIndex(value, segment)]
    } else {
      value =
        typeof segment === 'string' && isRecord(value)
          ? value[segment]
          : undefined
    }
  }
  return value
}
