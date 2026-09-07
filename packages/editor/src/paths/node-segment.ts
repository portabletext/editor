import type {KeyedSegment} from '../types/paths'

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
