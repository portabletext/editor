export type Node = Record<string, unknown>

/**
 * A canonical JSON encoding that erases identity: `_key` properties
 * are dropped, object properties are sorted, and annotation `_key`
 * references inside `span.marks` are rewritten to the definition's
 * position in `markDefs` (dropping `_key` alone would compare the
 * stored annotation key against the fresh one and reject an unchanged
 * link).
 */
export function neutralForm(node: Node): string {
  return encodeNeutral(node, buildAliasMap(node))
}

/**
 * Aliases each `markDefs` key to a key-independent spelling of the
 * definition itself, so `span.marks` references compare by what the
 * annotation is rather than which key it carries. The spelling is the
 * definition's own neutral form, not its array position: aliasing by
 * position made every annotated sibling span's neutral form shift when
 * a definition was inserted or removed before its own, so adding one
 * link re-keyed unrelated annotated spans. Identical definitions (the
 * same link twice) are disambiguated by occurrence order among
 * identical forms only, which no unrelated insertion can shift.
 */
export function buildAliasMap(node: Node): Map<string, string> | undefined {
  const markDefs = node['markDefs']
  if (!isTypedObjectArray(markDefs)) {
    return undefined
  }
  const aliasByKey = new Map<string, string>()
  const occurrenceByForm = new Map<string, number>()
  for (const definition of markDefs) {
    const key = definition['_key']
    if (typeof key !== 'string') {
      continue
    }
    const form = encodeNeutral(definition, undefined)
    const occurrence = occurrenceByForm.get(form) ?? 0
    occurrenceByForm.set(form, occurrence + 1)
    aliasByKey.set(key, `@annotation:${occurrence}:${form}`)
  }
  return aliasByKey
}

export function encodeNeutral(
  value: unknown,
  aliasByKey: Map<string, string> | undefined,
): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => encodeNeutral(item, aliasByKey)).join(',')}]`
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Node)
      .filter(([field]) => field !== '_key')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([field, fieldValue]) => {
        if (field === 'marks' && aliasByKey && Array.isArray(fieldValue)) {
          const aliased = fieldValue.map((mark) =>
            typeof mark === 'string' && aliasByKey.has(mark)
              ? aliasByKey.get(mark)
              : mark,
          )
          return `${JSON.stringify(field)}:${JSON.stringify(aliased)}`
        }
        return `${JSON.stringify(field)}:${encodeNeutral(fieldValue, aliasByKey)}`
      })
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

export function isTypedObjectArray(value: unknown): value is Array<Node> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Node)['_type'] === 'string',
    )
  )
}
