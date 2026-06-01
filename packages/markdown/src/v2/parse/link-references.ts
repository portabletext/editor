/**
 * Extract top-level link reference definitions from markdown source.
 *
 * Recognizes lines of the form:
 *   [label]: url
 *   [label]: url "title"
 *   [label]: url 'title'
 *   [label]: url (title)
 *
 * Definitions must start at column 0 (no leading whitespace beyond 3
 * spaces of indent, per CommonMark). Labels are normalized to
 * lower-case for case-insensitive lookup.
 *
 * Returns the markdown with the definitions removed, plus a refs map.
 */

export interface LinkReference {
  href: string
  title?: string
}

export interface LinkReferenceMap {
  [normalizedLabel: string]: LinkReference
}

const REF_LINE = /^ {0,3}\[([^\]]+)\]:\s*(\S+?)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/

export function extractLinkReferences(markdown: string): {
  markdown: string
  refs: LinkReferenceMap
} {
  const refs: LinkReferenceMap = {}
  const lines = markdown.split('\n')
  const kept: string[] = []
  for (const line of lines) {
    const m = line.match(REF_LINE)
    if (m) {
      const label = m[1]!.toLowerCase().trim().replace(/\s+/g, ' ')
      const href = m[2]!
      const title = m[3] ?? m[4] ?? m[5]
      if (!(label in refs)) {
        refs[label] = title === undefined ? {href} : {href, title}
      }
      // Drop this line from output.
      continue
    }
    kept.push(line)
  }
  return {markdown: kept.join('\n'), refs}
}
