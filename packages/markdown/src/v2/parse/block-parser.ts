/**
 * Block parser for `@portabletext/markdown` v2.
 *
 * Owns line scanning, container-stack management, and event emission.
 * Each block kind (paragraph, heading, blockquote, list, list_item,
 * code_block, fenced_code, thematic_break, html_block, table_row,
 * callout) is registered as one entry in `specs` with three predicates:
 *
 *   - `continue(container, line)`  - can this open container extend
 *     onto `line`?
 *   - `open(line, parent)`         - can a new container of this kind
 *     start at `line`'s cursor?
 *   - `close(container)`           - emit the close event and tear
 *     down state.
 *
 * The parser walks the input line by line. For each line:
 *
 *   1. Walk the open container stack top-down, calling `continue()`.
 *      Drop containers that don't continue.
 *   2. From the deepest open container, try each spec's `open()` in
 *      priority order until one matches or text content starts.
 *   3. Consume the remaining line content into the tip container.
 *
 * Lazy continuation falls out of step (1): each container records its
 * indent frame, and the parser advances the line cursor past each
 * frame's prefix before asking the next spec for a match.
 *
 * Day 1 scope: paragraph, heading, thematic_break. The container engine
 * is in place for the upcoming days (blockquote/list/list_item come on
 * Day 2; verbatim kinds on Day 3; tables/callouts on Day 4).
 *
 * See /specs/portabletext-markdown-v2-lazy-continuation.md §3.
 *
 * @internal
 */

import type {BlockEvent, BlockKind} from './events'

interface Line {
  /** Raw line text without the trailing newline. */
  raw: string
  /** Line number, 1-based. */
  number: number
  /** Cursor column within `raw`, advanced as containers strip their prefixes. */
  cursor: number
}

interface Container {
  spec: BlockSpec
  /** Column at which this container's content starts. */
  indent: number
  /** Spec-specific state. */
  data: Record<string, unknown>
  /** Source line where this container opened. */
  startLine: number
}

interface BlockSpec {
  name: BlockKind
  /**
   * Can this open container extend onto `line`? Called with the line's
   * cursor already past the parent's prefix. If true, the spec should
   * advance the cursor past its own prefix and return.
   */
  continue: (container: Container, line: Line) => boolean
  /**
   * Can a new container of this kind start at `line.cursor`? If true,
   * the spec must push a Container onto the stack via `ctx.push()` and
   * advance the cursor past its opening marker.
   */
  open: (line: Line, parent: Container, ctx: BlockParserContext) => boolean
  /** Called when the container is closed. May emit additional events. */
  close: (container: Container, ctx: BlockParserContext) => void
}

/** Context passed to spec callbacks. */
interface BlockParserContext {
  push: (container: Container) => void
  emit: (event: BlockEvent) => void
  /** Tip of the open-container stack. */
  tip: () => Container
}

const isBlankLine = (line: Line): boolean => {
  return /^[ \t]*$/.test(line.raw.slice(line.cursor))
}

/** Spec: paragraph (fallback). Continues while line is not blank. */
const paragraphSpec: BlockSpec = {
  name: 'paragraph',
  continue: (_c, line) => !isBlankLine(line),
  open: (line, parent, ctx) => {
    // Never open a new paragraph if the tip is already one — line content
    // will be absorbed by the existing paragraph in step 3.
    if (parent.spec.name === 'paragraph') {
      return false
    }
    ctx.push({
      spec: paragraphSpec,
      indent: line.cursor,
      data: {lines: [] as Array<string>},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'paragraph',
      location: {line: line.number, column: line.cursor + 1},
    })
    return true
  },
  close: (container, ctx) => {
    const lines = container.data['lines'] as Array<string>
    ctx.emit({
      kind: 'inline_run',
      text: lines.join('\n'),
      location: {line: container.startLine, column: container.indent + 1},
    })
    ctx.emit({
      kind: 'close',
      spec: 'paragraph',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

/** Spec: ATX heading (`#{1,6} `). Single line, never continues. */
const headingSpec: BlockSpec = {
  name: 'heading',
  continue: () => false,
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    const m = tail.match(/^(#{1,6})[ \t]+(.*?)[ \t]*$/)
    if (!m) {
      return false
    }
    const level = m[1]!.length
    const text = m[2] ?? ''
    ctx.push({
      spec: headingSpec,
      indent: line.cursor,
      data: {level, text},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'heading',
      data: {level},
      location: {line: line.number, column: line.cursor + 1},
    })
    ctx.emit({
      kind: 'inline_run',
      text,
      location: {line: line.number, column: line.cursor + level + 2},
    })
    line.cursor = line.raw.length
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'heading',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

/** Spec: thematic break (`---` / `***` / `___` with 3+ chars). Single line. */
const thematicBreakSpec: BlockSpec = {
  name: 'thematic_break',
  continue: () => false,
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    if (!/^[ ]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(tail)) {
      return false
    }
    ctx.push({
      spec: thematicBreakSpec,
      indent: line.cursor,
      data: {},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'thematic_break',
      location: {line: line.number, column: line.cursor + 1},
    })
    line.cursor = line.raw.length
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'thematic_break',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

const isBlockquoteLine = (line: Line): boolean => {
  const tail = line.raw.slice(line.cursor)
  return /^[ ]{0,3}>/.test(tail)
}

/** Spec: blockquote (`> ` prefix). Continues while line starts with `>`. */
const blockquoteSpec: BlockSpec = {
  name: 'blockquote',
  continue: (_c, line) => {
    if (!isBlockquoteLine(line)) {
      return false
    }
    // Advance past the `> ` prefix so inner specs see the line content.
    const tail = line.raw.slice(line.cursor)
    const m = tail.match(/^[ ]{0,3}>[ ]?/)
    if (m) {
      line.cursor += m[0].length
    }
    return true
  },
  open: (line, _parent, ctx) => {
    if (!isBlockquoteLine(line)) {
      return false
    }
    ctx.push({
      spec: blockquoteSpec,
      indent: line.cursor,
      data: {},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'blockquote',
      location: {line: line.number, column: line.cursor + 1},
    })
    // Advance past the `> ` prefix.
    const tail = line.raw.slice(line.cursor)
    const m = tail.match(/^[ ]{0,3}>[ ]?/)
    if (m) {
      line.cursor += m[0].length
    }
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'blockquote',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

interface ListMarkerInfo {
  kind: 'bullet' | 'number' | 'task'
  marker: string // e.g. "-", "1.", "+"
  checked?: boolean // for task
  markerWidth: number // columns consumed by marker + trailing space
}

const detectListMarker = (text: string): ListMarkerInfo | undefined => {
  // Try task first: "- [ ] " or "- [x] " / "- [X] "
  const task = text.match(/^([-*+])[ \t]+\[([ xX])\][ \t]+/)
  if (task) {
    return {
      kind: 'task',
      marker: task[1] ?? '-',
      checked: task[2] === 'x' || task[2] === 'X',
      markerWidth: task[0].length,
    }
  }
  // Bullet: "- ", "* ", "+ "
  const bullet = text.match(/^([-*+])[ \t]+/)
  if (bullet) {
    return {
      kind: 'bullet',
      marker: bullet[1] ?? '-',
      markerWidth: bullet[0].length,
    }
  }
  // Ordered: "1. " or "1) "
  const ordered = text.match(/^(\d{1,9})([.)])[ \t]+/)
  if (ordered) {
    return {
      kind: 'number',
      marker: (ordered[1] ?? '1') + (ordered[2] ?? '.'),
      markerWidth: ordered[0].length,
    }
  }
  return undefined
}

/** Spec: list. A container that holds list_item children. */
const listSpec: BlockSpec = {
  name: 'list',
  continue: (c, line) => {
    if (/^[ \t]*$/.test(line.raw.slice(line.cursor))) {
      return true
    }
    const tail = line.raw.slice(line.cursor)
    const leading = tail.match(/^[ \t]*/)![0].length
    const absoluteLeading = line.cursor + leading
    const itemIndent = c.data['lastItemIndent'] as number | undefined
    if (itemIndent !== undefined && absoluteLeading >= itemIndent) {
      return true
    }
    const marker = detectListMarker(tail.trimStart())
    if (marker && marker.kind === (c.data['kind'] as string)) {
      return true
    }
    return false
  },
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    const leading = tail.match(/^[ \t]{0,3}/)?.[0].length ?? 0
    const marker = detectListMarker(tail.slice(leading))
    if (!marker) {
      return false
    }
    // Advance past the optional leading indent so listItem sees the marker.
    line.cursor += leading
    ctx.push({
      spec: listSpec,
      indent: line.cursor,
      data: {
        kind: marker.kind,
        lastItemIndent: line.cursor + marker.markerWidth,
      },
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'list',
      data: {kind: marker.kind},
      location: {line: line.number, column: line.cursor + 1},
    })
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'list',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

/** Spec: list_item. The container that holds the item's blocks. */
const listItemSpec: BlockSpec = {
  name: 'list_item',
  continue: (c, line) => {
    // The item continues if the line is blank OR indented enough to be in
    // the item's content frame.
    const tail = line.raw.slice(line.cursor)
    if (/^[ \t]*$/.test(tail)) {
      return true
    }
    const leading = tail.match(/^[ \t]*/)![0].length
    const absoluteLeading = line.cursor + leading
    // If a list marker sits at exactly the column of the item's own
    // indent (i.e. at sibling level), close this item so a new sibling
    // item can open under the same list.
    const itemStart = c.indent - (c.data['marker'] as string).length
    if (absoluteLeading === itemStart) {
      const marker = detectListMarker(tail.trimStart())
      if (marker) {
        return false
      }
    }
    if (leading >= c.indent - line.cursor) {
      // Advance past the item's continuation indent.
      line.cursor += c.indent - line.cursor
      return true
    }
    return false
  },
  open: (line, parent, ctx) => {
    if (parent.spec.name !== 'list') {
      return false
    }
    const tail = line.raw.slice(line.cursor)
    // Allow optional leading whitespace up to the parent list's frame:
    // a sibling item at the same list's indent column may sit a few
    // spaces past line.cursor if a containing list_item continue
    // didn't fully consume the whitespace.
    const leading = tail.match(/^[ \t]*/)![0].length
    const cursorAfterLeading = line.cursor + leading
    if (cursorAfterLeading !== parent.indent) {
      return false
    }
    const marker = detectListMarker(tail.slice(leading))
    if (!marker) {
      return false
    }
    if (marker.kind !== (parent.data['kind'] as string)) {
      return false
    }
    line.cursor = cursorAfterLeading
    const indent = line.cursor + marker.markerWidth
    ctx.push({
      spec: listItemSpec,
      indent,
      data: {marker: marker.marker, checked: marker.checked},
      startLine: line.number,
    })
    parent.data['lastItemIndent'] = indent
    ctx.emit({
      kind: 'open',
      spec: 'list_item',
      data: {marker: marker.marker, checked: marker.checked},
      location: {line: line.number, column: line.cursor + 1},
    })
    line.cursor += marker.markerWidth
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'list_item',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

const fencedCodeSpec: BlockSpec = {
  name: 'fenced_code',
  continue: (c, line) => {
    const tail = line.raw.slice(line.cursor)
    const fenceChar = c.data['fenceChar'] as string
    const fenceLen = c.data['fenceLen'] as number
    const escapedFence = fenceChar === '`' ? '`' : '~'
    const closeFence = new RegExp(
      `^[ ]{0,3}${escapedFence}{${fenceLen},}[ \\t]*$`,
    )
    if (closeFence.test(tail)) {
      line.cursor = line.raw.length
      ;(c.data['_pendingClose'] as {flag: boolean}).flag = true
      return true
    }
    return true
  },
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    const m = tail.match(/^[ ]{0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)?[ \t]*$/)
    if (!m) {
      return false
    }
    const fence = m[1]!
    const lang = m[2] ?? ''
    ctx.push({
      spec: fencedCodeSpec,
      indent: line.cursor,
      data: {
        fenceChar: fence[0]!,
        fenceLen: fence.length,
        lang,
        _pendingClose: {flag: false},
        _isOpening: true,
        _fenceIndent: tail.match(/^[ ]{0,3}/)?.[0].length ?? 0,
      },
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'fenced_code',
      data: {lang},
      location: {line: line.number, column: line.cursor + 1},
    })
    line.cursor = line.raw.length
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'fenced_code',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

const indentedCodeSpec: BlockSpec = {
  name: 'code_block',
  continue: (_c, line) => {
    const tail = line.raw.slice(line.cursor)
    if (/^[ \t]*$/.test(tail)) {
      return true
    }
    const leading = tail.match(/^[ \t]*/)![0].length
    if (leading >= 4) {
      line.cursor += 4
      return true
    }
    return false
  },
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    const leading = tail.match(/^[ \t]*/)![0].length
    if (leading < 4) {
      return false
    }
    if (/^[ \t]*$/.test(tail)) {
      return false
    }
    ctx.push({
      spec: indentedCodeSpec,
      indent: line.cursor + 4,
      data: {},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'code_block',
      location: {line: line.number, column: line.cursor + 1},
    })
    line.cursor += 4
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'code_block',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

const htmlBlockSpec: BlockSpec = {
  name: 'html_block',
  continue: (_c, line) => {
    return !/^[ \t]*$/.test(line.raw.slice(line.cursor))
  },
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    if (!/^<\/?[a-zA-Z][a-zA-Z0-9-]*/.test(tail.trimStart())) {
      return false
    }
    // Record any extra leading-space indent inside the current container
    // (e.g. an html_block under a list item often has 1+ extra spaces);
    // continuation lines strip up to that many columns.
    const htmlIndent = tail.match(/^[ ]{0,3}/)?.[0].length ?? 0
    ctx.push({
      spec: htmlBlockSpec,
      indent: line.cursor,
      data: {_htmlIndent: htmlIndent},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'html_block',
      location: {line: line.number, column: line.cursor + 1},
    })
    ctx.emit({
      kind: 'verbatim_line',
      text: tail.replace(new RegExp(`^[ ]{0,${htmlIndent}}`), ''),
      location: {line: line.number, column: line.cursor + 1},
    })
    line.cursor = line.raw.length
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'html_block',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

/**
 * Table spec. A line starting with `|` opens a table_row container.
 * The events-to-portable-text fold collects contiguous rows and, when
 * the second row matches a delimiter pattern (`| --- | --- |`),
 * commits the group as a table block-object via `types.table`.
 *
 * Per-line approach: tableRowSpec opens one container per row and
 * emits its raw text as one inline_run. The fold owns the
 * commit-to-table-or-paragraph decision.
 */
const tableRowSpec: BlockSpec = {
  name: 'table_row',
  continue: () => false, // single line
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    if (!/^[ ]{0,3}\|/.test(tail)) {
      return false
    }
    ctx.push({
      spec: tableRowSpec,
      indent: line.cursor,
      data: {raw: tail},
      startLine: line.number,
    })
    ctx.emit({
      kind: 'open',
      spec: 'table_row',
      data: {raw: tail},
      location: {line: line.number, column: line.cursor + 1},
    })
    line.cursor = line.raw.length
    return true
  },
  close: (container, ctx) => {
    ctx.emit({
      kind: 'close',
      spec: 'table_row',
      location: {line: container.startLine, column: container.indent + 1},
    })
  },
}

const docSpec: BlockSpec = {
  name: 'doc',
  continue: () => true,
  open: () => false,
  close: () => undefined,
}

class BlockParser {
  private specs: BlockSpec[] = [
    blockquoteSpec,
    listItemSpec,
    listSpec,
    fencedCodeSpec,
    indentedCodeSpec,
    thematicBreakSpec,
    headingSpec,
    htmlBlockSpec,
    tableRowSpec,
  ]
  private containers: Container[] = []
  private events: BlockEvent[] = []

  parse(input: string): BlockEvent[] {
    this.containers = [
      {
        spec: docSpec,
        indent: 0,
        data: {},
        startLine: 0,
      },
    ]
    this.events = []

    const lines = input.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line: Line = {raw: lines[i] ?? '', number: i + 1, cursor: 0}
      this.parseLine(line)
    }
    this.closeAllFrom(1)
    return this.events
  }

  private ctx: BlockParserContext = {
    push: (c) => this.containers.push(c),
    emit: (e) => this.events.push(e),
    tip: () => this.containers[this.containers.length - 1]!,
  }

  private parseLine(line: Line): void {
    // 1. Walk open containers top-down, calling continue(). Drop containers
    //    that don't continue. Index 0 is the doc; we always continue past it.
    let i = 1
    while (i < this.containers.length) {
      const c = this.containers[i]!
      if (!c.spec.continue(c, line)) {
        this.closeAllFrom(i)
        break
      }
      i++
    }
    // Verbatim close handling: if a fenced_code's continue() flagged
    //    _pendingClose, we close now BEFORE the blank-line skip (the line
    //    cursor was advanced past the close fence so isBlankLine sees an
    //    empty tail).
    {
      const t = this.ctx.tip()
      if (t.spec.name === 'fenced_code') {
        const pending = t.data['_pendingClose'] as {flag: boolean} | undefined
        if (pending?.flag) {
          this.closeAllFrom(this.containers.length - 1)
          return
        }
      }
    }
    // 2. From the deepest open container, try each spec's open() until one
    //    matches or text content starts.
    if (isBlankLine(line)) {
      // Blank line closes any open paragraph. Other containers may absorb
      // it via their continue() predicate.
      const tip = this.ctx.tip()
      if (tip.spec.name === 'paragraph') {
        this.closeAllFrom(this.containers.length - 1)
      }
      return
    }
    // Try block-starting specs. Skip when inside a verbatim container
    // since every line there is literal content.
    const tipBeforeOpen = this.ctx.tip()
    const verbatimNames = new Set<string>([
      'fenced_code',
      'code_block',
      'html_block',
    ])
    if (!verbatimNames.has(tipBeforeOpen.spec.name)) {
      let opened = true
      while (opened) {
        opened = false
        const currentTip = this.ctx.tip()
        for (const spec of this.specs) {
          // If tip is paragraph and a non-paragraph block-starter
          // would match, close paragraph first so the new block
          // becomes a sibling, not a child.
          if (
            currentTip.spec.name === 'paragraph' &&
            spec.name !== 'paragraph'
          ) {
            const savedCursor = line.cursor
            // Probe by attempting open with a temporary handle.
            // Cheap check: peek-match against tail without mutating.
            const tail = line.raw.slice(line.cursor)
            const trimmedTail = tail.trimStart()
            const looksLikeBlock =
              (spec.name === 'list' &&
                detectListMarker(trimmedTail) !== undefined) ||
              (spec.name === 'blockquote' && /^>/.test(trimmedTail)) ||
              (spec.name === 'heading' &&
                /^#{1,6}(?:\s|$)/.test(trimmedTail)) ||
              (spec.name === 'thematic_break' &&
                /^([-*_])(?:\s*\1){2,}\s*$/.test(trimmedTail)) ||
              (spec.name === 'fenced_code' &&
                /^(`{3,}|~{3,})/.test(trimmedTail))
            if (looksLikeBlock) {
              this.closeAllFrom(this.containers.length - 1)
              line.cursor = savedCursor
            }
          }
          if (spec.open(line, this.ctx.tip(), this.ctx)) {
            opened = true
            break
          }
        }
      }
    }
    // 3. Consume remaining line content into the tip.
    let tip = this.ctx.tip()

    // Verbatim containers absorb every line as a literal verbatim_line.
    if (tip.spec.name === 'fenced_code') {
      const pending = tip.data['_pendingClose'] as {flag: boolean} | undefined
      if (pending?.flag) {
        this.closeAllFrom(this.containers.length - 1)
        return
      }
      if (tip.data['_isOpening']) {
        tip.data['_isOpening'] = false
        return
      }
      const fenceIndent = (tip.data['_fenceIndent'] as number) ?? 0
      const rawTail = line.raw.slice(line.cursor)
      const stripped = rawTail.replace(new RegExp(`^[ ]{0,${fenceIndent}}`), '')
      this.ctx.emit({
        kind: 'verbatim_line',
        text: stripped,
        location: {line: line.number, column: line.cursor + 1},
      })
      return
    }
    if (tip.spec.name === 'code_block') {
      this.ctx.emit({
        kind: 'verbatim_line',
        text: line.raw.slice(line.cursor),
        location: {line: line.number, column: line.cursor + 1},
      })
      return
    }
    if (tip.spec.name === 'html_block') {
      const htmlIndent = (tip.data['_htmlIndent'] as number) ?? 0
      const rawTail = line.raw.slice(line.cursor)
      const stripped = rawTail.replace(new RegExp(`^[ ]{0,${htmlIndent}}`), '')
      if (stripped.length > 0 || rawTail.length > 0) {
        this.ctx.emit({
          kind: 'verbatim_line',
          text: stripped,
          location: {line: line.number, column: line.cursor + 1},
        })
      }
      return
    }

    const tail = line.raw.slice(line.cursor)
    if (tail.length === 0) {
      return
    }
    const textBearing = new Set<string>(['paragraph', 'heading'])
    if (!textBearing.has(tip.spec.name)) {
      paragraphSpec.open(line, tip, this.ctx)
      tip = this.ctx.tip()
    }
    if (tip.spec.name === 'paragraph') {
      // Strip leading whitespace that survived container-prefix advancing.
      // Extra indent inside a list_item / blockquote is normalized away.
      ;(tip.data['lines'] as Array<string>).push(tail.replace(/^[ \t]+/, ''))
    }
  }

  private closeAllFrom(idx: number): void {
    while (this.containers.length > idx) {
      const c = this.containers.pop()!
      c.spec.close(c, this.ctx)
    }
  }
}

export function parseToBlockEvents(input: string): BlockEvent[] {
  return new BlockParser().parse(input)
}
