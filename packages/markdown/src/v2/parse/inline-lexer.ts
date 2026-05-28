/**
 * Inline lexer for `@portabletext/markdown` v2 (spike).
 *
 * Scans the text body of one block at a time and emits a stream of inline
 * tokens that the parser folds into PT spans + marks. The full CommonMark
 * flank rules for emphasis are deferred to the post-spike inline-scanner
 * hardening pass (see spec §8.1 step 3); the spike implements well-formed
 * emphasis only:
 *
 *   - `**...**` and `__...__` for strong
 *   - `*...*` and `_..._` for em
 *   - \`...\` for inline code (with backslash escape inside disabled)
 *   - `[label](href)` and `[label](href "title")` for link
 *   - `<https://...>` and `<mailto:...>` for autolink
 *   - trailing `  ` (two spaces) or `\\` at end-of-line for hard break
 *
 * Strike-through (`~~...~~`) and inline images (`![alt](src)`) are listed
 * in spec scope but skipped in the spike to keep this file small. They
 * follow the same shape as strong and link and will land in the second
 * pass.
 *
 * @internal
 */

import type {SourceLocation} from '../errors'

export const InlineTokenType = {
  Text: 'text',
  StrongOpen: 'strong-open',
  StrongClose: 'strong-close',
  EmOpen: 'em-open',
  EmClose: 'em-close',
  StrikeOpen: 'strike-open',
  StrikeClose: 'strike-close',
  CodeSpan: 'code-span',
  LinkOpen: 'link-open',
  LinkClose: 'link-close',
  Autolink: 'autolink',
  Image: 'image',
  HardBreak: 'hard-break',
  SoftBreak: 'soft-break',
} as const

export type InlineTokenType =
  (typeof InlineTokenType)[keyof typeof InlineTokenType]

export interface InlineToken {
  type: InlineTokenType
  text: string
  href?: string
  title?: string
  alt?: string
  src?: string
  location: SourceLocation
}

/**
 * Tokenize the inline body of a block. Newlines inside the body become
 * `SoftBreak` tokens unless they're preceded by two trailing spaces or a
 * backslash, in which case they become `HardBreak`.
 */
export function lexInline(source: string, startLine = 1): Array<InlineToken> {
  const tokens: Array<InlineToken> = []
  let i = 0
  let line = startLine
  let column = 1
  let textBuffer = ''
  let textLoc: SourceLocation = {line, column}

  const flushText = () => {
    if (textBuffer.length === 0) return
    tokens.push({
      type: InlineTokenType.Text,
      text: textBuffer,
      location: textLoc,
    })
    textBuffer = ''
  }

  const pushText = (ch: string) => {
    if (textBuffer.length === 0) textLoc = {line, column}
    textBuffer += ch
  }

  // Track open emphasis runs so we can emit matched open/close pairs.
  // Stack entries are the marker characters (`*`, `_`, `**`, `__`).
  const emphasisStack: Array<{marker: string; tokenIndex: number}> = []

  while (i < source.length) {
    const ch = source[i] ?? ''

    // Hard break: trailing `\` or two trailing spaces followed by newline.
    // Portable Text doesn't model hard breaks as a distinct construct; the
    // `\n` lives in the text of the surrounding span, matching v1's shape.
    // We accumulate the `\n` into the text buffer and skip the marker chars.
    if (ch === '\\' && source[i + 1] === '\n') {
      pushText('\n')
      i += 2
      line += 1
      column = 1
      continue
    }
    if (ch === ' ' && source[i + 1] === ' ' && source[i + 2] === '\n') {
      pushText('\n')
      i += 3
      line += 1
      column = 1
      continue
    }
    if (ch === '\n') {
      pushText('\n')
      i += 1
      line += 1
      column = 1
      continue
    }

    // Inline code span
    if (ch === '`') {
      let runLen = 0
      while (source[i + runLen] === '`') runLen += 1
      const marker = '`'.repeat(runLen)
      // Find closing run of the same length.
      let scan = i + runLen
      while (scan < source.length) {
        if (source.startsWith(marker, scan)) {
          // Make sure it's not a longer run.
          if (source[scan + runLen] !== '`') {
            const body = source.slice(i + runLen, scan)
            flushText()
            tokens.push({
              type: InlineTokenType.CodeSpan,
              text: body,
              location: {line, column},
            })
            const consumed = scan + runLen - i
            advance(consumed)
            i = i // already advanced
            break
          }
        }
        scan += 1
      }
      if (scan >= source.length) {
        // No closing run; treat as literal text.
        for (let k = 0; k < runLen; k += 1) pushText('`')
        i += runLen
        column += runLen
      }
      continue
    }

    // Autolink: <https://...> or <mailto:...>
    if (ch === '<') {
      const close = source.indexOf('>', i + 1)
      if (close > i) {
        const inner = source.slice(i + 1, close)
        if (/^(?:https?:\/\/|mailto:)\S+$/.test(inner)) {
          flushText()
          tokens.push({
            type: InlineTokenType.Autolink,
            text: inner,
            href: inner,
            location: {line, column},
          })
          const consumed = close - i + 1
          advance(consumed)
          continue
        }
      }
      // Fall through: treat as literal
    }

    // Image: ![alt](src "title")
    if (ch === '!' && source[i + 1] === '[') {
      const img = matchLink(source, i + 1)
      if (img) {
        flushText()
        tokens.push({
          type: InlineTokenType.Image,
          text: '',
          alt: img.label,
          src: img.href,
          title: img.title,
          location: {line, column},
        })
        advance(img.consumed + 1)
        continue
      }
    }

        // Link: [label](href "title")
    if (ch === '[') {
      const link = matchLink(source, i)
      if (link) {
        flushText()
        tokens.push({
          type: InlineTokenType.LinkOpen,
          text: '',
          href: link.href,
          title: link.title,
          location: {line, column},
        })
        const labelTokens = lexInline(link.label, line)
        tokens.push(...labelTokens)
        tokens.push({
          type: InlineTokenType.LinkClose,
          text: '',
          location: {line, column},
        })
        advance(link.consumed)
        continue
      }
    }

    // Strikethrough: `~~...~~`.
    if (ch === '~' && source[i + 1] === '~') {
      const marker = '~~'
      const top = emphasisStack[emphasisStack.length - 1]
      if (top && top.marker === marker) {
        flushText()
        emphasisStack.pop()
        tokens.push({type: InlineTokenType.StrikeClose, text: '', location: {line, column}})
        advance(2)
        continue
      }
      if (i + 2 < source.length && source[i + 2] !== ' ' && source[i + 2] !== '\n') {
        flushText()
        emphasisStack.push({marker, tokenIndex: tokens.length})
        tokens.push({type: InlineTokenType.StrikeOpen, text: '', location: {line, column}})
        advance(2)
        continue
      }
    }

    // Emphasis. Spike grammar: `**...**` and `__...__` for strong; `*...*`
    // and `_..._` for em. We do simple paired matching; full flank rules
    // are deferred per spec §8.1.
    if (ch === '*' || ch === '_') {
      const runLen = ch === source[i + 1] ? 2 : 1
      const marker = ch.repeat(runLen)
      const top = emphasisStack[emphasisStack.length - 1]
      if (top && top.marker === marker) {
        // Close: emit close token, retroactively confirm the open.
        flushText()
        emphasisStack.pop()
        tokens.push({
          type:
            runLen === 2
              ? InlineTokenType.StrongClose
              : InlineTokenType.EmClose,
          text: '',
          location: {line, column},
        })
        advance(runLen)
        continue
      }
      // Open: only treat as open if followed by a non-space character.
      if (
        i + runLen < source.length &&
        source[i + runLen] !== ' ' &&
        source[i + runLen] !== '\n'
      ) {
        flushText()
        emphasisStack.push({marker, tokenIndex: tokens.length})
        tokens.push({
          type:
            runLen === 2 ? InlineTokenType.StrongOpen : InlineTokenType.EmOpen,
          text: '',
          location: {line, column},
        })
        advance(runLen)
        continue
      }
      // Fall through: literal
    }

    // Backslash escape
    if (ch === '\\' && i + 1 < source.length) {
      const next = source[i + 1] ?? ''
      if (/[!\"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(next)) {
        pushText(next)
        i += 2
        column += 2
        continue
      }
    }

    // Default: accumulate as text
    pushText(ch)
    i += 1
    column += 1
  }

  flushText()

  // Unclosed emphasis: convert any leftover `Open` tokens back into text.
  // This is a minimal recovery; a stricter mode would throw `UnbalancedEmphasis`.
  for (const entry of emphasisStack) {
    const t = tokens[entry.tokenIndex]
    if (!t) continue
    t.type = InlineTokenType.Text
    t.text = entry.marker
  }

  return tokens

  function advance(n: number) {
    // Track column; if we cross newlines, the per-character path above handles
    // them; advance() is only called for non-newline-spanning sequences in
    // this scanner.
    column += n
    i += n
  }
}

interface LinkMatch {
  label: string
  href: string
  title: string | undefined
  consumed: number
}

function matchLink(source: string, start: number): LinkMatch | null {
  // [label](href "title")
  // Find the matching ] for [, allowing escaped brackets inside.
  let depth = 1
  let i = start + 1
  while (i < source.length && depth > 0) {
    const ch = source[i]
    if (ch === '\\' && i + 1 < source.length) {
      i += 2
      continue
    }
    if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) break
    }
    i += 1
  }
  if (depth !== 0) return null
  const labelEnd = i
  if (source[labelEnd + 1] !== '(') return null
  const label = source.slice(start + 1, labelEnd)
  // Parse href + optional title inside (...)
  let j = labelEnd + 2
  // Skip spaces
  while (source[j] === ' ') j += 1
  let href = ''
  while (
    j < source.length &&
    source[j] !== ' ' &&
    source[j] !== ')' &&
    source[j] !== '\t'
  ) {
    href += source[j]
    j += 1
  }
  // Skip spaces
  while (source[j] === ' ' || source[j] === '\t') j += 1
  let title: string | undefined
  if (source[j] === '"' || source[j] === "'") {
    const quote = source[j]
    const titleStart = j + 1
    j = titleStart
    while (j < source.length && source[j] !== quote) j += 1
    if (j >= source.length) return null
    title = source.slice(titleStart, j)
    j += 1
    while (source[j] === ' ' || source[j] === '\t') j += 1
  }
  if (source[j] !== ')') return null
  return {label, href, title, consumed: j - start + 1}
}
