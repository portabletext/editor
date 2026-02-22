/**
 * Simple regex-based markdown parser for inline syntax.
 * Extracts ranges with character offsets for decoration mapping.
 *
 * Each range has:
 * - type: the markdown construct (strong, emphasis, heading, code, strikethrough)
 * - from: start of opening delimiter
 * - textStart: start of content (after delimiter)
 * - textEnd: end of content (before closing delimiter)
 * - to: end of closing delimiter
 */

export type MarkdownRangeType = 'strong' | 'emphasis' | 'code' | 'strikethrough'

export type MarkdownRange = {
  type: MarkdownRangeType
  from: number
  textStart: number
  textEnd: number
  to: number
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type BlockParse = {
  headingLevel: HeadingLevel | null
  headingSyntaxEnd: number
  ranges: Array<MarkdownRange>
}

/**
 * Parse a single block's text for inline markdown syntax.
 * Returns ranges sorted by position.
 */
export function parseBlockText(text: string): BlockParse {
  const ranges: Array<MarkdownRange> = []

  // Detect heading prefix: # through ######
  let headingLevel: HeadingLevel | null = null
  let headingSyntaxEnd = 0
  const headingMatch = text.match(/^(#{1,6})\s/)
  if (headingMatch) {
    headingLevel = headingMatch[1].length as HeadingLevel
    headingSyntaxEnd = headingMatch[0].length
  }

  // Bold: **text**
  // Use a regex that finds ** pairs, non-greedy
  const boldRegex = /\*\*(.+?)\*\*/g
  let match: RegExpExecArray | null
  match = boldRegex.exec(text)
  while (match !== null) {
    ranges.push({
      type: 'strong',
      from: match.index,
      textStart: match.index + 2,
      textEnd: match.index + 2 + match[1].length,
      to: match.index + match[0].length,
    })
    match = boldRegex.exec(text)
  }

  // Italic: _text_ (using underscores to avoid conflict with * bold)
  // Also support *text* but only single asterisks not preceded/followed by *
  const underscoreItalicRegex = /(?<!\w)_(.+?)_(?!\w)/g
  match = underscoreItalicRegex.exec(text)
  while (match !== null) {
    ranges.push({
      type: 'emphasis',
      from: match.index,
      textStart: match.index + 1,
      textEnd: match.index + 1 + match[1].length,
      to: match.index + match[0].length,
    })
    match = underscoreItalicRegex.exec(text)
  }

  // Inline code: `text`
  const codeRegex = /`([^`]+)`/g
  match = codeRegex.exec(text)
  while (match !== null) {
    ranges.push({
      type: 'code',
      from: match.index,
      textStart: match.index + 1,
      textEnd: match.index + 1 + match[1].length,
      to: match.index + match[0].length,
    })
    match = codeRegex.exec(text)
  }

  // Strikethrough: ~~text~~
  const strikethroughRegex = /~~(.+?)~~/g
  match = strikethroughRegex.exec(text)
  while (match !== null) {
    ranges.push({
      type: 'strikethrough',
      from: match.index,
      textStart: match.index + 2,
      textEnd: match.index + 2 + match[1].length,
      to: match.index + match[0].length,
    })
    match = strikethroughRegex.exec(text)
  }

  // Sort by position
  ranges.sort((a, b) => a.from - b.from)

  return {headingLevel, headingSyntaxEnd, ranges}
}
