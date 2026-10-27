/**
 * Truncates a degradation snippet to keep the reported message readable,
 * backing off by one unit when the cut would land on a lead surrogate so a
 * snippet ending mid-emoji doesn't produce an unpaired surrogate.
 *
 * Keep in sync with `packages/markdown/src/from-portable-text/degradation-report.ts`'s
 * `truncateSnippet`.
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

// Keep in sync with `packages/markdown/src/from-portable-text/degradation-report.ts`'s
// `MAX_LISTED_PER_GROUP`.
const MAX_LISTED_PER_GROUP = 5

/**
 * Builds the canonical grouped message reported alongside a non-empty
 * `degradations` array: identical (`type`, `message`) pairs collapse into
 * one line, and groups sort by their earliest `position` so the message
 * reads top to bottom. `positionLabel` names the position (`line` when
 * reading Slack content, `block` when writing it).
 *
 * Keep in sync with `packages/markdown/src/to-portable-text/markdown-to-portable-text.ts`'s
 * `buildDegradationMessage` and `packages/markdown/src/from-portable-text/degradation-report.ts`'s
 * `buildSerializeDegradationMessage`.
 */
export function buildDegradationMessage(
  header: string,
  positionLabel: 'line' | 'block',
  degradations: ReadonlyArray<{
    type: string
    message: string
    snippet?: string
    position: number
  }>,
): string {
  const groups: Array<{
    base: string
    entries: Array<(typeof degradations)[number]>
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

  const minPosition = (entries: ReadonlyArray<{position: number}>): number =>
    entries.reduce(
      (lowest, entry) => Math.min(lowest, entry.position),
      Number.POSITIVE_INFINITY,
    )

  const sortedGroups = [...groups].sort(
    (a, b) => minPosition(a.entries) - minPosition(b.entries),
  )

  const lines = sortedGroups.map((group) => {
    if (group.entries.length === 1) {
      const event = group.entries[0]!
      const snippetPart =
        event.snippet === undefined ? '' : ` ("${event.snippet}")`
      return `- ${positionLabel} ${event.position}: ${event.message}${snippetPart}`
    }

    const snippets = group.entries
      .map((entry) => entry.snippet)
      .filter((snippet): snippet is string => snippet !== undefined)

    const count = group.entries.length
    const positions = [
      ...new Set(group.entries.map((entry) => entry.position)),
    ].sort((a, b) => a - b)
    const suffix =
      snippets.length === count
        ? `(${count}×: ${capList(snippets.map((snippet) => `"${snippet}"`))})`
        : `(${count}×: ${positionLabel}s ${capList(positions.map(String))})`

    return `- ${group.base} ${suffix}`
  })

  return [header, ...lines].join('\n')
}

function capList(values: ReadonlyArray<string>): string {
  if (values.length <= MAX_LISTED_PER_GROUP) {
    return values.join(', ')
  }
  const shown = values.slice(0, MAX_LISTED_PER_GROUP)
  const more = values.length - MAX_LISTED_PER_GROUP
  return `${shown.join(', ')}, and ${more} more`
}
