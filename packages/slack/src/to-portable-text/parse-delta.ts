export type DeltaAttributes = Record<string, unknown>

export type DeltaItem =
  | {type: 'text'; text: string; attributes: DeltaAttributes}
  | {type: 'embed'; embed: Record<string, unknown>; attributes: DeltaAttributes}

export type DeltaLine = {
  items: Array<DeltaItem>
  attributes: DeltaAttributes
}

/**
 * Reads `slack/texty` as a Quill Delta and splits it into lines. Quill puts
 * a line's formatting (`list`, `indent`, `blockquote`, `code-block`) on the
 * `\n` that ends it, and the run formatting on the text before it, so an
 * insert holding several `\n` applies its attributes to each line it ends.
 * `\r\n` and a lone `\r` end a line too, so no `\r` reaches span text.
 * Returns `undefined` when `texty` isn't JSON holding an `ops` array.
 */
export function parseDelta(texty: string): Array<DeltaLine> | undefined {
  let parsed: unknown

  try {
    parsed = JSON.parse(texty)
  } catch {
    return undefined
  }

  if (!isRecord(parsed) || !Array.isArray(parsed['ops'])) {
    return undefined
  }

  const lines: Array<DeltaLine> = []
  let items: Array<DeltaItem> = []

  for (const op of parsed['ops']) {
    if (!isRecord(op)) {
      continue
    }

    const attributes = isRecord(op['attributes']) ? op['attributes'] : {}
    const insert = op['insert']

    if (isRecord(insert)) {
      items.push({type: 'embed', embed: insert, attributes})
      continue
    }

    if (typeof insert !== 'string') {
      continue
    }

    const segments = insert.replace(/\r\n?/g, '\n').split('\n')

    segments.forEach((text, index) => {
      if (text.length > 0) {
        items.push({type: 'text', text, attributes})
      }

      if (index < segments.length - 1) {
        lines.push({items, attributes})
        items = []
      }
    })
  }

  if (items.length > 0) {
    lines.push({items, attributes: {}})
  }

  return lines
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
