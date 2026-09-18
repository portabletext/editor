/**
 * The classification of a lossy conversion encountered while converting
 * Portable Text to Markdown: an annotation or decorator with no mark
 * renderer, a block style or list-item kind with no renderer, always
 * because a consumer's `renderers` option doesn't cover it (the built-in
 * renderers cover every Portable Text construct they define).
 * `list-item-fallback` never fires under the default configuration: the
 * default `listItem` renderer is a single function covering every kind,
 * so the event only fires behind a consumer-supplied partial `listItem`
 * map.
 *
 * @public
 */
export type SerializeDegradationType =
  | 'annotation-dropped'
  | 'decorator-dropped'
  | 'style-fallback'
  | 'list-item-fallback'

/**
 * Reports a single lossy conversion, in encounter order: as the walk
 * renders the blocks array, top to bottom. `path` addresses the node the
 * loss occurred on, read from the top-level `blocks` array down: an array
 * position is `{_key: node._key}` when the node at that position has a
 * `_key`, the numeric index otherwise, and an object property is its
 * field name. A table cell's degradation carries the full path down to
 * the offending node (`[{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells',
 * {_key: 'c1'}, 'value', {_key: 'b1'}, 'children', {_key: 's1'}]` for a
 * span in a cell), not just the table's own position, and a keyless
 * top-level block reports a numeric first segment rather than the key the
 * conversion generates for it internally (`[0]`, never a made-up key).
 * `path` is best-effort: it names the deepest node the conversion can
 * re-find from its enclosing top-level block, falling back to just the
 * top-level segment when it can't. That happens when a custom renderer
 * clones a nested node under a different identity before rendering it,
 * and it also happens for a keyless nested span, since the conversion
 * rebuilds every marked span into a new wrapper object with no stable
 * reference back to the original and nothing to search by once the
 * `_key` is missing too. An annotation covering several spans reports
 * the first covered span's path.
 * `snippet` is the offending text, truncated to 40 characters with an
 * ellipsis, present whenever there's a specific piece of text to quote and
 * absent when there is none (an empty span, say). `message` is
 * human-readable and may change between releases. Match on `type`, not
 * `message`. The set of `type` values grows in minor releases as new
 * degradation sites report, so compare against the values you handle
 * rather than switching exhaustively.
 *
 * @public
 */
export type SerializeDegradation = {
  type: SerializeDegradationType
  message: string
  path: Array<string | number | {_key: string}>
  snippet?: string
}

type PathSegment = SerializeDegradation['path'][number]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nodesMatch(candidate: unknown, target: object): boolean {
  return candidate === target
}

/**
 * `buildMarksTree` (`@portabletext/toolkit`) rebuilds every marked span
 * into a synthetic `@span` wrapper: it copies the original span's `_key`
 * onto the wrapper, but the wrapper's own `children` hold freshly built
 * `@text` leaves (the span's text re-split on newlines), never the
 * original span object, so a wrapper's identity search can't find its
 * source span by reference. This is the one place a `_key` match stands
 * in for a broken reference, and it's deliberately narrow: `target` must
 * be such a wrapper (`_type === '@span'`), `candidate` must be a real
 * Portable Text span (`_type === 'span'`), and `candidate` must sit
 * directly inside a `children` array, since that's the only array a span
 * can ever occupy. Without that last constraint, a row, cell, or block
 * that happens to reuse the wrapped span's `_key` (legal: `_key`
 * uniqueness only holds among siblings) would match first.
 */
function spanKeyMatches(
  candidate: unknown,
  target: object,
  containerKey: string | undefined,
): boolean {
  if (containerKey !== 'children') {
    return false
  }
  if (!isPlainObject(candidate) || candidate['_type'] !== 'span') {
    return false
  }
  const targetRecord = target as Record<string, unknown>
  if (targetRecord['_type'] !== '@span') {
    return false
  }
  const candidateKey = candidate['_key']
  const targetKey = targetRecord['_key']
  return (
    typeof candidateKey === 'string' &&
    typeof targetKey === 'string' &&
    candidateKey === targetKey
  )
}

function findDescendantPath(
  container: unknown,
  target: object,
  containerKey: string | undefined,
): Array<PathSegment> | undefined {
  if (Array.isArray(container)) {
    for (let index = 0; index < container.length; index++) {
      const child: unknown = container[index]
      const segment: PathSegment =
        isPlainObject(child) && typeof child['_key'] === 'string'
          ? {_key: child['_key']}
          : index
      if (
        nodesMatch(child, target) ||
        spanKeyMatches(child, target, containerKey)
      ) {
        return [segment]
      }
      if (isPlainObject(child) || Array.isArray(child)) {
        const nested = findDescendantPath(child, target, undefined)
        if (nested !== undefined) {
          return [segment, ...nested]
        }
      }
    }
    return undefined
  }

  if (isPlainObject(container)) {
    for (const key of Object.keys(container)) {
      const child = container[key]
      if (nodesMatch(child, target)) {
        return [key]
      }
      if (isPlainObject(child) || Array.isArray(child)) {
        const nested = findDescendantPath(child, target, key)
        if (nested !== undefined) {
          return [key, ...nested]
        }
      }
    }
    return undefined
  }

  return undefined
}

/**
 * Reconstructs a degradation's `path` by identity search from its
 * enclosing top-level block: the walk renders the same node references it
 * was given, so the offending node is still reachable by searching the
 * top-level block's own structure for it, except for a span rebuilt into
 * a marks tree, whose wrapper is a new object (see `spanKeyMatches`) and
 * is instead found by matching a real span carrying the wrapper's `_key`.
 * `path` is best-effort: it names the deepest node the search manages to
 * re-find, and falls back to just `topSegment` when it can't, which
 * happens when a custom renderer clones a node under a different identity
 * before rendering it, or when the node in question (a nested span with
 * no `_key` of its own) has neither a stable reference nor a `_key` to
 * search by. A `_key` search also can't tell apart two spans that share a
 * `_key` across separate `children` arrays of the same top-level block
 * (rows, table cells): whichever one the search reaches first wins, even
 * if it isn't the one that degraded.
 */
export function buildSerializeDegradationPath(
  topLevelBlock: object,
  topSegment: PathSegment,
  target: object,
): Array<PathSegment> {
  if (nodesMatch(topLevelBlock, target)) {
    return [topSegment]
  }
  const nested = findDescendantPath(topLevelBlock, target, undefined)
  return nested === undefined ? [topSegment] : [topSegment, ...nested]
}

/**
 * Truncates a degradation message's snippet to keep the reported message
 * readable, backing off by one unit when the cut would land on a lead
 * surrogate so a snippet ending mid-emoji doesn't produce an unpaired
 * surrogate. Undefined for empty input, so a construct with nothing to
 * quote omits `snippet` entirely instead of reporting `""`.
 *
 * Keep in sync with `to-portable-text/markdown-to-portable-text.ts`'s own
 * `truncateSnippet`: duplicated rather than imported, since the parse
 * side's version isn't exported and the two sides have no other coupling.
 */
export function truncateSnippet(
  text: string,
  maxLength = 40,
): string | undefined {
  if (text.length === 0) {
    return undefined
  }

  if (text.length <= maxLength) {
    return text.replace(/\n/g, '\\n')
  }

  let cut = maxLength
  const codeUnit = text.charCodeAt(cut - 1)
  if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
    cut -= 1
  }

  return `${text.slice(0, cut).replace(/\n/g, '\\n')}...`
}

// Keep in sync with `to-portable-text/markdown-to-portable-text.ts`'s own
// `MAX_LISTED_PER_GROUP`.
const MAX_LISTED_PER_GROUP = 5

function capList(values: ReadonlyArray<string>): string {
  if (values.length <= MAX_LISTED_PER_GROUP) {
    return values.join(', ')
  }
  const shown = values.slice(0, MAX_LISTED_PER_GROUP)
  const more = values.length - MAX_LISTED_PER_GROUP
  return `${shown.join(', ')}, and ${more} more`
}

/**
 * A `SerializeDegradation` paired with the 0-based index of its enclosing
 * top-level block, used only to render and sort the grouped message:
 * `path`'s first segment can be a `_key`, which sorts by encounter order,
 * not by document order, so the message needs the plain index alongside
 * it. Not part of the public payload.
 */
type SerializeDegradationWithTopIndex = SerializeDegradation & {
  topIndex: number
}

/**
 * Builds the canonical grouped message reported alongside a non-empty
 * `degradations` array: identical (`type`, `message`) pairs collapse into
 * one line, so a document with the same missing decorator on three spans
 * doesn't repeat the same sentence three times. Groups sort by their
 * earliest `topIndex` across all their entries, not by which entry
 * happened to be encountered first, so the message reads top-to-bottom
 * regardless of walk order.
 *
 * Mirrors `to-portable-text/markdown-to-portable-text.ts`'s
 * `buildDegradationMessage`, adapted to `topIndex` (always present, no
 * "no line" fallback needed).
 */
export function buildSerializeDegradationMessage(
  degradations: ReadonlyArray<SerializeDegradationWithTopIndex>,
): string {
  const groups: Array<{
    base: string
    entries: Array<SerializeDegradationWithTopIndex>
  }> = []
  const groupIndexByKey = new Map<string, number>()

  for (const degradation of degradations) {
    const key = `${degradation.type}\u0000${degradation.message}`
    let groupIndex = groupIndexByKey.get(key)
    if (groupIndex === undefined) {
      groupIndex = groups.length
      groupIndexByKey.set(key, groupIndex)
      groups.push({base: degradation.message, entries: []})
    }
    groups[groupIndex]!.entries.push(degradation)
  }

  const minTopIndex = (
    entries: ReadonlyArray<SerializeDegradationWithTopIndex>,
  ): number =>
    entries.reduce(
      (lowest, entry) => Math.min(lowest, entry.topIndex),
      Number.POSITIVE_INFINITY,
    )

  const sortedGroups = [...groups].sort(
    (a, b) => minTopIndex(a.entries) - minTopIndex(b.entries),
  )

  const lines = sortedGroups.map((group) => {
    if (group.entries.length === 1) {
      const event = group.entries[0]!
      const snippetPart =
        event.snippet === undefined ? '' : ` ("${event.snippet}")`
      return `- block ${event.topIndex}: ${event.message}${snippetPart}`
    }

    const snippets = group.entries
      .map((entry) => entry.snippet)
      .filter((snippet): snippet is string => snippet !== undefined)

    const count = group.entries.length
    const suffix =
      snippets.length === count
        ? `(${count}\u00d7: ${capList(snippets.map((snippet) => `"${snippet}"`))})`
        : `(${count}\u00d7: blocks ${capList([...new Set(group.entries.map((entry) => entry.topIndex))].sort((a, b) => a - b).map(String))})`

    return `- ${group.base} ${suffix}`
  })

  return [
    'Portable Text could not be serialized to Markdown without loss:',
    ...lines,
  ].join('\n')
}
