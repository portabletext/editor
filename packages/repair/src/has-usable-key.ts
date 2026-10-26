/**
 * A key only addresses a node when it's a non-empty string. Sync payloads
 * and hand-authored content can carry `undefined`, `null`, or `''`.
 */
export function hasUsableKey(key: unknown): key is string {
  return typeof key === 'string' && key !== ''
}
