import type {KeyedSegment} from '../types/paths'
import {isRecord} from '../utils/asserters'

/**
 * A key only addresses a node when it's a non-empty string; sync payloads
 * and hand-authored content can carry `undefined`, `null`, or `''`.
 */
export function hasUsableKey(key: unknown): key is string {
  return typeof key === 'string' && key !== ''
}

/**
 * The path segment that identifies `node` among its siblings: keyed when
 * the node has a usable `_key`, otherwise the sibling index. A fabricated
 * `{_key: undefined}` segment identifies nothing (several keyless siblings
 * would all canonicalize to the same segment), so producers of resolved
 * paths must fall back to the index until normalization mints a key.
 */
export function nodeSegment(
  node: {_key?: unknown},
  index: number,
): KeyedSegment | number {
  return hasUsableKey(node._key) ? {_key: node._key} : index
}

/**
 * A key segment only finds the one element meant when every sibling is an
 * object and no other sibling shares the key.
 */
export function isAddressableByKey(
  elements: Array<unknown>,
  key: string,
): boolean {
  let count = 0
  for (const element of elements) {
    if (!isRecord(element)) {
      return false
    }
    if (element['_key'] === key) {
      count++
    }
  }
  return count === 1
}
