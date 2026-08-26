import {isPortableTextSpan} from '@portabletext/toolkit'
import type {
  ArbitraryTypedObject,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types'
import LinkifyIt from 'linkify-it'

/**
 * The CommonMark ASCII punctuation set. Only these characters can be
 * backslash-escaped into a literal without changing the parsed text.
 */
const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/

const ENTITY_REFERENCE = /&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g
const BACKSLASH_BEFORE_PUNCTUATION = new RegExp(
  `\\\\(?=${ASCII_PUNCTUATION.source})`,
  'g',
)
const TILDE_RUN = /~{2,}/g
const HTML_LIKE_ANGLE_BRACKET = /<(?=[a-zA-Z/!?])/g
const BRACKET_BEFORE_LINK_OPEN = /\](?=[([])/g

/**
 * markdown-it's own emphasis-flanking rule classifies a delimiter's
 * neighbor as punctuation using Unicode's `P` (Punctuation) and `S`
 * (Symbol) categories, not just ASCII: an emoji, an em dash, or a CJK
 * character flanks a `*`/`_` run exactly like an ASCII punctuation
 * character does, so testing ASCII alone would fabricate emphasis next to
 * non-ASCII text the real reparse wouldn't create. Matched against one
 * full code point at a time (a surrogate pair for an astral character
 * like an emoji), never a lone UTF-16 code unit, which the category
 * classes never match.
 */
const UNICODE_PUNCTUATION_OR_SYMBOL = /^(?:\p{P}|\p{S})$/u

// Configured with no options, exactly like markdown-it constructs its own
// `md.linkify` instance: same default schemas (http/https/ftp/'//'/mailto)
// and the same built-in TLD list, so a range this reports as a link is a
// range the real reparse will claim too.
const linkify = new LinkifyIt()

type LeafPiece =
  | {kind: 'text'; raw: string; isLinkLabel: boolean; markSignature: string}
  | {kind: 'hardBreak'}
  | {kind: 'opaque'}

/**
 * Stands in for one opaque child (an inline object, or a leaf a custom
 * renderer will replace) in a joined line's text. It can never match a
 * hazard's trigger character, so it safely walls off an in-progress
 * construct (an ordered-list marker, a ref-def label) without needing a
 * dedicated flag, while still counting as real, non-whitespace content for
 * emphasis-flanking purposes.
 */
const OPAQUE_CHAR = '\0'

/** Which leaf (by index into the flat `pieces` list) a line character came
 * from, and at what offset into that leaf's *prepared* text (raw text, with
 * a link-label leaf's brackets/backslashes already doubled). `null` marks
 * an opaque character: it has no leaf-local home, so no edit can target it. */
interface LineChar {
  pieceIndex: number
  offset: number
}

/** A single-position splice against a joined line's raw text: remove
 * `deleteCount` characters at `at` and put `insert` in their place. A pure
 * insertion (a backslash escape) has `deleteCount: 0`. */
interface Edit {
  at: number
  deleteCount: number
  insert: string
  /**
   * Set for an entity-reference or backtick escape: both change what
   * markdown-it's inline parser hands to its linkify pass (an entity
   * decodes first, a backtick can open a code span first), so the linkify
   * mask - built from this line's raw, undecoded text - can never be
   * trusted to have already accounted for them. Kept regardless of any
   * linkify claim overlapping it.
   */
  bypassLinkifyMask?: boolean
}

/**
 * Plans the escaped replacement for every plain-text leaf a block's children
 * will produce, in the exact left-to-right order `renderText` visits them
 * (mirroring `buildMarksTree`'s own `text.split('\n')` leaf splitting).
 *
 * Escaping runs ahead of rendering, over the flat span sequence: some
 * hazards only exist across a leaf boundary (an ordered-list marker, a
 * ref-def label, an emphasis run) because an annotation or decorator mark
 * that introduces no markup of its own splices its children in seamlessly.
 * The plan works line by line (a block's children joined into text, split
 * at hard breaks) rather than leaf by leaf: each line's leaves are joined
 * into one string first, opaque children (inline objects, or leaves a
 * custom renderer will replace) masked with a sentinel that can't match any
 * hazard, and every hazard - inline and line-start alike - is detected once
 * against that real, complete line, with true left/right context on both
 * sides. Detected hazards become position-tracked edits against the line's
 * raw text, which are then split back into each contributing leaf's own
 * escaped text; only that composition step is leaf-scoped.
 *
 * A joined line's text that markdown-it's own linkify pass (bundled as
 * `linkify-it`) would claim as a bare URL or email is masked from most
 * edits: the linkify carve-out promises that substring round-trips
 * byte-identical, gaining only a link mark, so escaping inside it would
 * corrupt text linkify is about to claim as a link's visible text. An
 * entity-reference or backtick escape is never masked (see `computeLinkifyMask`
 * for why), and a claim spliced across a decorator boundary is never masked
 * in the first place.
 *
 * `isHeading` is set for ATX headings: only the first joined line sits
 * inside the `# ` prefix an ATX heading can never be reparsed as a block
 * construct within, so line-leading hazards are skipped there; a hard
 * break's later lines are ordinary markdown lines and get the full
 * line-start battery. That first line carries a line-*end* hazard of its
 * own instead: a trailing `#`-run reads back as the heading's own optional
 * closing sequence.
 *
 * `isListItem` is set when the block renders as list-item content: a
 * `[ ] `/`[x] `/`[X] ` at the very start of the first joined line reads
 * back as a GFM task-list checkbox, regardless of the list's own item type.
 *
 * `hardBreakOutputHasNewline` says whether the renderer's actual hard-break
 * output contains a newline. A custom `hardBreak` can render to something
 * with no newline of its own (eg `() => '<br />'`), in which case the
 * leaves on either side of it land on the same rendered line, not two: a
 * hard break like that can't be planned as a line boundary, so it's walled
 * off as an opaque segment instead, the same protection an inline object's
 * unknown rendered text already gets.
 */
export function planLeafEscaping(
  children: ReadonlyArray<PortableTextSpan | ArbitraryTypedObject>,
  markDefs: ReadonlyArray<PortableTextMarkDefinition>,
  options: {
    isHeading: boolean
    isListItem: boolean
    hardBreakOutputHasNewline: boolean
  },
): Array<string> {
  const linkMarkKeys = new Set(
    markDefs.filter((def) => def._type === 'link').map((def) => def._key),
  )
  // Every markDef key a span's marks can reference (any annotation, not
  // just link): what's left after removing those from a span's `marks` is
  // its decorator set, the only marks `buildMarksTree` reliably renders as
  // delimiters by default (an unregistered annotation type falls back to
  // passing its children through unchanged, same as an unknown decorator).
  const markDefKeys = new Set(markDefs.map((def) => def._key))
  const pieces: Array<LeafPiece> = []

  for (const child of children) {
    if (isPortableTextSpan(child)) {
      const isLinkLabel = (child.marks ?? []).some((mark) =>
        linkMarkKeys.has(mark),
      )
      // Sorted so two spans carrying the same decorators in a different
      // order still compare equal: `buildMarksTree` nests by decorator
      // identity, not by a span's own array order, so it produces the same
      // markup boundaries either way.
      const markSignature = (child.marks ?? [])
        .filter((mark) => !markDefKeys.has(mark))
        .sort()
        .join(',')
      const lines = child.text.split('\n')
      lines.forEach((line, index) => {
        if (index > 0) {
          pieces.push(
            options.hardBreakOutputHasNewline
              ? {kind: 'hardBreak'}
              : {kind: 'opaque'},
          )
        }
        pieces.push({kind: 'text', raw: line, isLinkLabel, markSignature})
      })
    } else {
      pieces.push({kind: 'opaque'})
    }
  }

  const pieceOutputs: Array<string> = pieces.map(() => '')

  let lineIndex = 0
  let lineText = ''
  let lineChars: Array<LineChar | null> = []
  let lineIsLinkLabelChar: Array<boolean> = []
  let lineMarkSignature: Array<string> = []

  const flushLine = () => {
    processLine({
      text: lineText,
      chars: lineChars,
      isLinkLabelChar: lineIsLinkLabelChar,
      markSignature: lineMarkSignature,
      lineIndex,
      isHeading: options.isHeading,
      isListItem: options.isListItem,
      pieceOutputs,
    })
    lineIndex++
    lineText = ''
    lineChars = []
    lineIsLinkLabelChar = []
    lineMarkSignature = []
  }

  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
    const piece = pieces[pieceIndex]

    if (!piece || piece.kind === 'hardBreak') {
      flushLine()
      continue
    }

    if (piece.kind === 'opaque') {
      lineText += OPAQUE_CHAR
      lineChars.push(null)
      lineIsLinkLabelChar.push(false)
      lineMarkSignature.push('')
      continue
    }

    // A link label's brackets and backslashes are escaped unconditionally,
    // up front: a label must stay bracket-balanced regardless of context,
    // so this doesn't depend on anything the line-level hazard scan below
    // discovers.
    const prepared = piece.isLinkLabel
      ? escapeLinkLabelBrackets(piece.raw)
      : piece.raw

    for (let offset = 0; offset < prepared.length; offset++) {
      lineText += prepared[offset]
      lineChars.push({pieceIndex, offset})
      lineIsLinkLabelChar.push(piece.isLinkLabel)
      lineMarkSignature.push(piece.markSignature)
    }
  }
  flushLine()

  const escaped: Array<string> = []
  pieces.forEach((piece, index) => {
    if (piece.kind === 'text') {
      escaped.push(pieceOutputs[index] ?? '')
    }
  })
  return escaped
}

function processLine(args: {
  text: string
  chars: Array<LineChar | null>
  isLinkLabelChar: Array<boolean>
  markSignature: Array<string>
  lineIndex: number
  isHeading: boolean
  isListItem: boolean
  pieceOutputs: Array<string>
}): void {
  const {text, chars, isLinkLabelChar, markSignature, pieceOutputs} = args

  const linkifyMask = computeLinkifyMask(
    text,
    chars,
    isLinkLabelChar,
    markSignature,
  )
  const edits = [
    ...collectInlineEdits(text, isLinkLabelChar),
    ...collectLineStartEdits(text, args),
  ].filter((edit) => edit.bypassLinkifyMask || !isMasked(edit, linkifyMask))

  applyEdits(text, chars, edits, pieceOutputs)
}

/**
 * Marks every character of this line that markdown-it's linkify pass would
 * claim as part of a bare URL or email. Link-label and opaque characters
 * are blanked out first: a link label's visible text sits inside `[...]`
 * markup real linkify never reconsiders, and an opaque child's rendered
 * text is unknown at plan time, so neither should join or seed a match.
 *
 * The probe only sees this line's raw, undecoded text, one hazard pass
 * ahead of markdown-it's own pipeline: it runs linkify against inline
 * tokenization and entity decoding, not before them. A claim survives only
 * if it lies entirely inside one run of identical decorator marks: a
 * decorator boundary crossing it splices that decorator's delimiters
 * (`**`, `` ` ``, ...) into the middle of the range real linkify would see,
 * which breaks the very claim being trusted. An annotation-only boundary
 * (a link's own label text is already excluded above; any other
 * annotation type falls back to rendering with no delimiters at all,
 * same as an unregistered decorator) never splices, so it can't invalidate
 * a claim either.
 */
function computeLinkifyMask(
  text: string,
  chars: Array<LineChar | null>,
  isLinkLabelChar: Array<boolean>,
  markSignature: Array<string>,
): Array<boolean> {
  const mask = new Array<boolean>(text.length).fill(false)

  // Every schema `linkify-it`'s default config recognizes - `http(s):`,
  // `ftp:`, `//`, `www.`, and a `user@host` email - needs a `.`, `:`, or
  // `@` somewhere in the line; skipping the match call on a line with
  // none of those is the cheap majority-case exit, not a heuristic that
  // could miss a real claim.
  if (!/[.:@]/.test(text)) {
    return mask
  }

  let probe = ''
  for (let index = 0; index < text.length; index++) {
    probe += chars[index] === null || isLinkLabelChar[index] ? ' ' : text[index]
  }

  const matches = linkify.match(probe) ?? []
  for (const match of matches) {
    if (match.schema === '') {
      // A fuzzy claim (`www.`, bare domain): markdown-it's emphasis pass
      // beats these on reparse, so paired `*`/`_`/`~~` inside one is
      // consumed as markup and the characters vanish. Only explicit-scheme
      // claims (`http:`, `mailto:`, ...) win whole against inline
      // constructs; fuzzy forms take normal escaping instead, trading
      // their link mark for text fidelity.
      continue
    }
    const signature = markSignature[match.index]
    let staysWithinOneMarkRun = true
    for (let index = match.index; index < match.lastIndex; index++) {
      if (markSignature[index] !== signature) {
        staysWithinOneMarkRun = false
        break
      }
    }
    if (!staysWithinOneMarkRun) {
      continue
    }
    for (let index = match.index; index < match.lastIndex; index++) {
      mask[index] = true
    }
  }
  return mask
}

function isMasked(edit: Edit, mask: ReadonlyArray<boolean>): boolean {
  const end = edit.at + Math.max(edit.deleteCount, 1)
  for (let index = edit.at; index < end; index++) {
    if (mask[index]) {
      return true
    }
  }
  return false
}

/** Rewrites a line's raw text into each contributing leaf's escaped text by
 * walking it once, left to right, applying at most one edit per position.
 * Every hazard is keyed off its own trigger character - a backslash, a
 * tilde, a backtick, an `&`, a `<`, a `*`/`_`, a `]`, or (line-start only,
 * one hazard per line) a `#`, `>`, `[`, `-`/`+`/`*`, the `.`/`)` after an
 * ordered-list marker's digits, `=`, 4 spaces, or a tab - and no two of
 * those characters coincide at one position, so two edits can never target
 * the same position. */
function applyEdits(
  text: string,
  chars: ReadonlyArray<LineChar | null>,
  edits: ReadonlyArray<Edit>,
  pieceOutputs: Array<string>,
): void {
  const editsByPosition = new Map<number, Edit>()
  for (const edit of edits) {
    if (editsByPosition.has(edit.at)) {
      throw new Error(
        `Two hazard edits targeted the same position (${edit.at}); ` +
          'hazard trigger characters are assumed disjoint by construction.',
      )
    }
    editsByPosition.set(edit.at, edit)
  }

  let index = 0
  while (index < text.length) {
    const edit = editsByPosition.get(index)
    const owner = chars[index]

    if (edit) {
      if (owner) {
        pieceOutputs[owner.pieceIndex] =
          (pieceOutputs[owner.pieceIndex] ?? '') + edit.insert
      }
      if (edit.deleteCount > 0) {
        index += edit.deleteCount
        continue
      }
    }

    if (owner) {
      pieceOutputs[owner.pieceIndex] =
        (pieceOutputs[owner.pieceIndex] ?? '') + (text[index] ?? '')
    }
    index++
  }
}

/**
 * Hazards that can appear anywhere on a line: emphasis/strikethrough runs,
 * a backtick, an entity reference, an HTML/autolink-shaped `<`, a literal
 * backslash before punctuation, and a `]` immediately before `(`/`[`
 * (which would otherwise read back as a link/image open).
 */
function collectInlineEdits(
  text: string,
  isLinkLabelChar: ReadonlyArray<boolean>,
): Array<Edit> {
  const edits: Array<Edit> = []

  for (const match of text.matchAll(BACKSLASH_BEFORE_PUNCTUATION)) {
    const at = match.index ?? 0
    // A link label's backslashes were already doubled unconditionally
    // while preparing its text; doubling them again here would flip their
    // parity back to unescaped.
    if (!isLinkLabelChar[at]) {
      edits.push({at, deleteCount: 0, insert: '\\'})
    }
  }

  for (const match of text.matchAll(TILDE_RUN)) {
    const start = match.index ?? 0
    for (let index = start; index < start + match[0].length; index++) {
      edits.push({at: index, deleteCount: 0, insert: '\\'})
    }
  }

  for (let index = 0; index < text.length; index++) {
    if (text[index] === '`') {
      // Every backtick is escaped outright: even a lone one can pair with
      // another lone backtick elsewhere to open a code span, which the
      // linkify mask can't see coming - a code span forms during inline
      // tokenization, before linkify ever runs - so this bypasses it.
      edits.push({
        at: index,
        deleteCount: 0,
        insert: '\\',
        bypassLinkifyMask: true,
      })
    }
  }

  for (const match of text.matchAll(ENTITY_REFERENCE)) {
    // An entity reference decodes before linkify runs, so a masked range
    // built from this line's raw text can't already account for it.
    edits.push({
      at: match.index ?? 0,
      deleteCount: 0,
      insert: '\\',
      bypassLinkifyMask: true,
    })
  }

  for (const match of text.matchAll(HTML_LIKE_ANGLE_BRACKET)) {
    edits.push({at: match.index ?? 0, deleteCount: 0, insert: '\\'})
  }

  edits.push(...collectEmphasisEdits(text))

  for (const match of text.matchAll(BRACKET_BEFORE_LINK_OPEN)) {
    const at = match.index ?? 0
    // A link label's `]` was already escaped unconditionally while
    // preparing its text (`escapeLinkLabelBrackets`); escaping it again
    // here would double the backslash and reopen the label early on
    // reparse, same reasoning as the backslash rule above.
    if (!isLinkLabelChar[at]) {
      edits.push({at, deleteCount: 0, insert: '\\'})
    }
  }

  return edits
}

function isWhitespace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char)
}

function isPunctuation(char: string | undefined): boolean {
  return char !== undefined && UNICODE_PUNCTUATION_OR_SYMBOL.test(char)
}

/**
 * The full code point sitting immediately before `index`: two UTF-16 code
 * units for an astral character (eg an emoji) whose low surrogate lands at
 * `index - 1`, one otherwise.
 */
function codePointBefore(text: string, index: number): string | undefined {
  if (index <= 0) {
    return undefined
  }
  if (
    index >= 2 &&
    isLowSurrogate(text[index - 1]) &&
    isHighSurrogate(text[index - 2])
  ) {
    return text.slice(index - 2, index)
  }
  return text[index - 1]
}

/**
 * The full code point sitting immediately at `index`: two UTF-16 code units
 * for an astral character whose high surrogate lands at `index`, one
 * otherwise.
 */
function codePointAt(text: string, index: number): string | undefined {
  if (index >= text.length) {
    return undefined
  }
  if (isHighSurrogate(text[index]) && isLowSurrogate(text[index + 1])) {
    return text.slice(index, index + 2)
  }
  return text[index]
}

function isHighSurrogate(char: string | undefined): boolean {
  if (char === undefined) {
    return false
  }
  const code = char.charCodeAt(0)
  return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(char: string | undefined): boolean {
  if (char === undefined) {
    return false
  }
  const code = char.charCodeAt(0)
  return code >= 0xdc00 && code <= 0xdfff
}

function isLeftFlanking(
  before: string | undefined,
  after: string | undefined,
): boolean {
  if (isWhitespace(after)) {
    return false
  }
  return !isPunctuation(after) || isWhitespace(before) || isPunctuation(before)
}

function isRightFlanking(
  before: string | undefined,
  after: string | undefined,
): boolean {
  if (isWhitespace(before)) {
    return false
  }
  return !isPunctuation(before) || isWhitespace(after) || isPunctuation(after)
}

/**
 * Finds `*`/`_` runs CommonMark would treat as flanking delimiters, using
 * each run's true neighbors on the joined line (the start/end of the line
 * itself counts as whitespace, matching the spec's treatment of line
 * boundaries).
 */
function collectEmphasisEdits(text: string): Array<Edit> {
  const edits: Array<Edit> = []
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (char !== '*' && char !== '_') {
      index++
      continue
    }

    let end = index
    while (end < text.length && text[end] === char) {
      end++
    }

    const before = codePointBefore(text, index)
    const after = codePointAt(text, end)
    const leftFlanking = isLeftFlanking(before, after)
    const rightFlanking = isRightFlanking(before, after)

    const canOpen =
      char === '_'
        ? leftFlanking && (!rightFlanking || isPunctuation(before))
        : leftFlanking
    const canClose =
      char === '_'
        ? rightFlanking && (!leftFlanking || isPunctuation(after))
        : rightFlanking

    if (canOpen || canClose) {
      for (let position = index; position < end; position++) {
        edits.push({at: position, deleteCount: 0, insert: '\\'})
      }
    }

    index = end
  }

  return edits
}

/**
 * Hazards that only matter at the start (or, for a handful of whole-line
 * constructs, the start *and* end) of a line: headings, blockquotes, list
 * markers, ref-defs, setext underlines, thematic breaks, indented code, and
 * a list item's own GFM task-checkbox prefix. A fence needs no branch of
 * its own here: the inline backtick/tilde escaping every line already
 * neutralizes the run a fence needs, so it can never open one on reparse.
 * The remaining branches are mutually exclusive by construction
 * (each targets a disjoint leading character) and return as soon as one
 * matches, mirroring how CommonMark itself commits to one block-start
 * interpretation per line; the checkbox branch above is the one exception,
 * since a list item's checkbox prefix and, say, its heading marker are two
 * independent hazards that can both apply to the same first line.
 */
function collectLineStartEdits(
  text: string,
  context: {isHeading: boolean; isListItem: boolean; lineIndex: number},
): Array<Edit> {
  const edits: Array<Edit> = []
  const isFirstLine = context.lineIndex === 0

  // CommonMark allows up to 3 leading spaces before a block marker without
  // affecting how it's parsed, so every hazard below (including the GFM
  // task-checkbox the parser's own pre-pass looks for, after its own
  // leading-whitespace trim) checks what follows them; the escape itself
  // still has to land right before the marker, not at the front of those
  // spaces (a backslash-space isn't an escape).
  const leadingSpaces = /^ {0,3}/.exec(text)?.[0].length ?? 0
  const rest = text.slice(leadingSpaces)

  if (context.isListItem && isFirstLine && /^\[[ xX]\] /.test(rest)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
  }

  if (context.isHeading && isFirstLine) {
    // A closing sequence must be preceded by a space, unless it's *all*
    // the heading has: then the space ATX headings require after their
    // opening `#`s stands in for it.
    const closingSequence = /^(?:(.*[ \t]))?(#+[ \t]*)$/.exec(text)
    if (closingSequence) {
      edits.push({
        at: closingSequence[1]?.length ?? 0,
        deleteCount: 0,
        insert: '\\',
      })
    }
    return edits
  }

  const orderedListMarker = /^ {0,3}(\d{1,9})([.)])(?=[ \t]|$)/.exec(text)
  if (orderedListMarker) {
    edits.push({
      at: orderedListMarker[0].length - 1,
      deleteCount: 0,
      insert: '\\',
    })
    return edits
  }

  if (/^#{1,6}(?:[ \t]|$)/.test(rest)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  if (rest.startsWith('>')) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  if (/^\[[^\]\n]*\]:/.test(rest)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  if (/^[-+*](?:[ \t]|$)/.test(rest)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  // CommonMark 4.1 allows interior spaces/tabs between a thematic break's
  // delimiter characters.
  if (/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(text)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  if (/^ {0,3}=+[ \t]*$/.test(text)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  if (/^ {0,3}-+[ \t]*$/.test(text)) {
    edits.push({at: leadingSpaces, deleteCount: 0, insert: '\\'})
    return edits
  }

  if (/^ {4}/.test(text)) {
    // A numeric character reference decodes to the same literal character
    // during inline parsing, after block structure (and its indented-code
    // -block rule, 4 columns of leading whitespace) has already been
    // decided.
    edits.push({at: 0, deleteCount: 1, insert: '&#32;'})
    return edits
  }

  const tabIndent = /^ {0,3}\t/.exec(text)
  if (tabIndent) {
    // A tab advances to the next multiple of 4 columns, so even 0-3
    // leading spaces before one reaches the indented-code-block
    // threshold; encoding the tab itself (not the spaces before it) is
    // enough to break that count.
    edits.push({at: tabIndent[0].length - 1, deleteCount: 1, insert: '&#9;'})
    return edits
  }

  return edits
}

/**
 * Text rendered inside a link label needs every `[`, `]` and `\` escaped
 * unconditionally, on top of the general-purpose hazard escaping every
 * line gets: a link label must stay bracket-balanced, and any literal
 * backslash in it needs protecting regardless of what follows (unlike
 * plain text, where only a backslash immediately before punctuation is a
 * hazard).
 */
function escapeLinkLabelBrackets(text: string): string {
  return text.replace(/[[\]\\]/g, (char) => `\\${char}`)
}
