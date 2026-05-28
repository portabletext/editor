/**
 * Block-level lexer for `@portabletext/markdown` v2.
 *
 * Reads markdown line-by-line and emits a stream of typed block tokens.
 * Each token captures the line(s) it spans, with the inline text body left as
 * a raw string for the inline lexer to scan later.
 *
 * The lexer is intentionally context-light: the parser sets `inFencedCode`
 * when it's inside an open fence so the next lines are emitted as raw
 * `CodeLine` tokens instead of being reinterpreted. The same flag is used to
 * skip the blockquote / list-item prefix recognition while inside a fence.
 *
 * Spike scope (see /specs/portabletext-markdown-v2.md §3.3):
 *   - ATX heading
 *   - fenced code block (\`\`\` and ~~~)
 *   - thematic break (---, ___, ***)
 *   - blockquote (> )
 *   - list item (- , * , + , 1. , 1) )
 *   - paragraph (default)
 *
 * Out of scope for the spike: setext, indented code, HTML block, tables,
 * GFM alerts, task-list checkboxes (added in the second pass).
 *
 * @internal
 */

import type {SourceLocation} from '../errors'

export const BlockTokenType = {
  Paragraph: 'paragraph',
  Heading: 'heading',
  FenceOpen: 'fence-open',
  FenceClose: 'fence-close',
  CodeLine: 'code-line',
  ThematicBreak: 'thematic-break',
  BlockquotePrefix: 'blockquote-prefix',
  ListItemStart: 'list-item-start',
  BlankLine: 'blank-line',
  Eof: 'eof',
} as const

export type BlockTokenType =
  (typeof BlockTokenType)[keyof typeof BlockTokenType]

export interface BlockToken {
  type: BlockTokenType
  /** Raw body text. For headings this is the body after `#+\s+`; for
   * paragraph lines this is the line minus any consumed blockquote / list
   * prefixes; for code lines this is the line verbatim. */
  text: string
  /** Heading level 1-6; only set for `Heading` tokens. */
  level?: number
  /** Fence info string (e.g. 'typescript'); only set for `FenceOpen`. */
  info?: string
  /** List marker kind; only set for `ListItemStart`. */
  listKind?: 'bullet' | 'number'
  /** Ordered list start number; only set for `ListItemStart` with `number`. */
  listStart?: number
  /** Indent (spaces) preceding this line's content. Used by the parser to
   * decide list nesting and lazy-continuation. */
  indent: number
  location: SourceLocation
}

const ATX_HEADING = /^(#{1,6})(?:\s+(.*?))?\s*#*\s*$/
const FENCE_OPEN = /^(`{3,}|~{3,})\s*([^`]*)$/
const THEMATIC_BREAK = /^[ ]{0,3}([-_*])(?:[ \t]*\1){2,}[ \t]*$/
const BULLET_ITEM = /^([-*+])([ \t]+)(.*)$/
const ORDERED_ITEM = /^(\d{1,9})([.)])([ \t]+)(.*)$/

interface LexerState {
  lines: ReadonlyArray<string>
  index: number
  /** Set by the parser before consuming a fenced code block body. */
  inFencedCode: boolean
  /** When in a fence, the exact opening run we wait for to close. */
  fenceMarker: string
}

export class BlockLexer {
  private state: LexerState

  constructor(source: string) {
    this.state = {
      lines: source.replace(/\r\n?/g, '\n').split('\n'),
      index: 0,
      inFencedCode: false,
      fenceMarker: '',
    }
  }

  /** Set the lexer into "inside fenced code" mode. Called by the parser
   * after it consumes a `FenceOpen` token. The marker is the exact backtick
   * or tilde run that opened the fence; the lexer emits `CodeLine` until a
   * matching run (with optional trailing whitespace) is seen, at which
   * point it emits `FenceClose` and returns to normal mode. */
  enterFencedCode(marker: string): void {
    this.state.inFencedCode = true
    this.state.fenceMarker = marker
  }

  next(): BlockToken {
    const {lines} = this.state
    if (this.state.index >= lines.length) {
      return {
        type: BlockTokenType.Eof,
        text: '',
        indent: 0,
        location: this.locHere(),
      }
    }

    const raw = lines[this.state.index] ?? ''
    const lineNumber = this.state.index + 1
    this.state.index += 1

    if (this.state.inFencedCode) {
      // Inside a fenced code block: any line that consists of the marker
      // (\u00a9 or longer run of the same character) followed by optional
      // whitespace closes the fence. Everything else is a raw code line.
      const closeMatch = raw.match(
        new RegExp(
          `^\\s{0,3}(${escapeRegex(this.state.fenceMarker[0] ?? '')}{${this.state.fenceMarker.length},})\\s*$`,
        ),
      )
      if (closeMatch) {
        this.state.inFencedCode = false
        this.state.fenceMarker = ''
        return {
          type: BlockTokenType.FenceClose,
          text: '',
          indent: 0,
          location: {line: lineNumber, column: 1},
        }
      }
      return {
        type: BlockTokenType.CodeLine,
        text: raw,
        indent: 0,
        location: {line: lineNumber, column: 1},
      }
    }

    const trimmed = raw.trimStart()
    const indent = raw.length - trimmed.length

    if (trimmed === '') {
      return {
        type: BlockTokenType.BlankLine,
        text: '',
        indent: 0,
        location: {line: lineNumber, column: 1},
      }
    }

    // Thematic break (>=3 of - _ *, possibly spaced)
    if (THEMATIC_BREAK.test(raw)) {
      return {
        type: BlockTokenType.ThematicBreak,
        text: '',
        indent,
        location: {line: lineNumber, column: indent + 1},
      }
    }

    // ATX heading
    const heading = trimmed.match(ATX_HEADING)
    if (heading) {
      return {
        type: BlockTokenType.Heading,
        level: heading[1]?.length ?? 1,
        text: heading[2] ?? '',
        indent,
        location: {line: lineNumber, column: indent + 1},
      }
    }

    // Fence open
    const fence = trimmed.match(FENCE_OPEN)
    if (fence) {
      return {
        type: BlockTokenType.FenceOpen,
        text: '',
        info: (fence[2] ?? '').trim(),
        indent,
        location: {line: lineNumber, column: indent + 1},
      }
    }

    // Blockquote prefix: `> ...`. Emit a prefix token; the body after the
    // `> ` is queued by the parser as a recursive lex on the trailing text.
    if (trimmed.startsWith('>')) {
      const afterMarker = trimmed.slice(1).replace(/^[ \t]?/, '')
      return {
        type: BlockTokenType.BlockquotePrefix,
        text: afterMarker,
        indent,
        location: {line: lineNumber, column: indent + 1},
      }
    }

    // Bullet list item
    const bullet = trimmed.match(BULLET_ITEM)
    if (bullet) {
      return {
        type: BlockTokenType.ListItemStart,
        listKind: 'bullet',
        text: bullet[3] ?? '',
        indent,
        location: {line: lineNumber, column: indent + 1},
      }
    }

    // Ordered list item
    const ordered = trimmed.match(ORDERED_ITEM)
    if (ordered) {
      return {
        type: BlockTokenType.ListItemStart,
        listKind: 'number',
        listStart: Number(ordered[1]),
        text: ordered[4] ?? '',
        indent,
        location: {line: lineNumber, column: indent + 1},
      }
    }

    // Default: paragraph line
    return {
      type: BlockTokenType.Paragraph,
      text: trimmed,
      indent,
      location: {line: lineNumber, column: indent + 1},
    }
  }

  /** Peek the next token without consuming it. Used by the parser to decide
   * whether to keep extending a paragraph or close it. */
  peek(): BlockToken {
    const savedIndex = this.state.index
    const savedFlag = this.state.inFencedCode
    const savedMarker = this.state.fenceMarker
    const token = this.next()
    this.state.index = savedIndex
    this.state.inFencedCode = savedFlag
    this.state.fenceMarker = savedMarker
    return token
  }

  private locHere(): SourceLocation {
    return {line: this.state.index + 1, column: 1}
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
