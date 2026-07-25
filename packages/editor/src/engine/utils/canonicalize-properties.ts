/**
 * Rebuilds JSON values with a deterministic property order: `_type` first,
 * `_key` second, then the remaining properties sorted alphabetically.
 *
 * Two editors assemble the same content through different code paths (local
 * edits, remote patches, whole-value adoption of fetched documents), and
 * each path produces a different property order for otherwise identical
 * nodes. Property order is semantically meaningless, but serialized
 * snapshots (`JSON.stringify`) of converged clients should agree
 * byte-for-byte. Canonicalizing every value at the engine's mutation
 * chokepoints guarantees that.
 *
 * Returns the input reference unchanged when it is already canonical, so
 * untouched subtrees keep their identity.
 */
export function canonicalizeProperties<T>(value: T): T {
  if (Array.isArray(value)) {
    let result: unknown[] | undefined
    for (let index = 0; index < value.length; index++) {
      const canonicalItem = canonicalizeProperties(value[index])
      if (canonicalItem !== value[index] && result === undefined) {
        result = value.slice()
      }
      if (result !== undefined) {
        result[index] = canonicalItem
      }
    }
    return (result ?? value) as T
  }

  if (typeof value !== 'object' || value === null) {
    return value
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  const orderedKeys = orderKeys(keys)

  let changed = false
  for (let index = 0; index < keys.length; index++) {
    if (keys[index] !== orderedKeys[index]) {
      changed = true
      break
    }
  }

  if (!changed) {
    let result: Record<string, unknown> | undefined
    for (const key of keys) {
      const canonicalProperty = canonicalizeProperties(record[key])
      if (canonicalProperty !== record[key] && result === undefined) {
        result = {...record}
      }
      if (result !== undefined) {
        result[key] = canonicalProperty
      }
    }
    return (result ?? value) as T
  }

  const result: Record<string, unknown> = {}
  for (const key of orderedKeys) {
    result[key] = canonicalizeProperties(record[key])
  }
  return result as T
}

/**
 * Reorders only the top-level properties of a node, leaving nested values
 * untouched. Used on the hot mutation path where nested values are either
 * unchanged references (already canonical) or freshly canonicalized.
 */
export function canonicalizeOwnProperties<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  const orderedKeys = orderKeys(keys)

  let changed = false
  for (let index = 0; index < keys.length; index++) {
    if (keys[index] !== orderedKeys[index]) {
      changed = true
      break
    }
  }

  if (!changed) {
    return value
  }

  const result: Record<string, unknown> = {}
  for (const key of orderedKeys) {
    result[key] = record[key]
  }
  return result as T
}

function orderKeys(keys: ReadonlyArray<string>): Array<string> {
  const rest: Array<string> = []
  let hasType = false
  let hasKey = false

  for (const key of keys) {
    if (key === '_type') {
      hasType = true
    } else if (key === '_key') {
      hasKey = true
    } else {
      rest.push(key)
    }
  }

  rest.sort()

  const ordered: Array<string> = []
  if (hasType) {
    ordered.push('_type')
  }
  if (hasKey) {
    ordered.push('_key')
  }
  ordered.push(...rest)

  return ordered
}
