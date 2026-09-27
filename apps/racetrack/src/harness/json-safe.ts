/**
 * Deep copy that keeps only what survives `JSON.stringify` meaningfully:
 * functions, maps, sets, DOM nodes, and cycles are dropped. The copy is taken
 * synchronously because the engine passes its own objects by reference.
 */
export function toJsonSafe(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'function' ||
      typeof value === 'symbol' ||
      typeof value === 'bigint'
      ? undefined
      : value
  }

  if (
    value instanceof Map ||
    value instanceof Set ||
    value instanceof WeakMap ||
    value instanceof WeakSet ||
    (typeof Node !== 'undefined' && value instanceof Node) ||
    (typeof Event !== 'undefined' && value instanceof Event) ||
    seen.has(value)
  ) {
    return undefined
  }

  seen.add(value)

  if (Array.isArray(value)) {
    const copy = value.map((item) => toJsonSafe(item, seen) ?? null)
    seen.delete(value)
    return copy
  }

  const copy: Record<string, unknown> = Object.create(null)
  for (const [key, item] of Object.entries(value)) {
    const safe = toJsonSafe(item, seen)
    if (safe !== undefined) {
      copy[key] = safe
    }
  }
  seen.delete(value)
  return copy
}
