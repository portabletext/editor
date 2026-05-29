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

export interface Line {
  /** Raw line text without the trailing newline. */
  raw: string
  /** Line number, 1-based. */
  number: number
  /** Cursor column within `raw`, advanced as containers strip their prefixes. */
  cursor: number
}

export interface Container {
  spec: BlockSpec
  /** Column at which this container's content starts. */
  indent: number
  /** Spec-specific state. */
  data: Record<string, unknown>
  /** Source line where this container opened. */
  startLine: number
}

export interface BlockSpec {
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
export interface BlockParserContext {
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
  open: (line, _parent, ctx) => {
    ctx.push({
      spec: paragraphSpec,
      indent: line.cursor,
      data: {lines: [] as Array<string>},
      startLine: line.number,
    })
    ctx.emit({kind: 'open', spec: 'paragraph', location: {line: line.number, column: line.cursor + 1}})
    return true
  },
  close: (container, ctx) => {
    const lines = container.data['lines'] as Array<string>
    ctx.emit({
      kind: 'inline_run',
      text: lines.join('\n'),
      location: {line: container.startLine, column: container.indent + 1},
    })
    ctx.emit({kind: 'close', spec: 'paragraph', location: {line: container.startLine, column: container.indent + 1}})
  },
}

/** Spec: ATX heading (`#{1,6} `). Single line, never continues. */
const headingSpec: BlockSpec = {
  name: 'heading',
  continue: () => false,
  open: (line, _parent, ctx) => {
    const tail = line.raw.slice(line.cursor)
    const m = tail.match(/^(#{1,6})[ \t]+(.*?)[ \t]*$/)
    if (!m) return false
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
    if (!/^[ ]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(tail)) return false
    ctx.push({
      spec: thematicBreakSpec,
      indent: line.cursor,
      data: {},
      startLine: line.number,
    })
    ctx.emit({kind: 'open', spec: 'thematic_break', location: {line: line.number, column: line.cursor + 1}})
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

const docSpec: BlockSpec = {
  name: 'doc',
  continue: () => true,
  open: () => false,
  close: () => undefined,
}

export class BlockParser {
  private specs: BlockSpec[] = [thematicBreakSpec, headingSpec]
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
    // Try block-starting specs.
    let opened = true
    while (opened) {
      opened = false
      for (const spec of this.specs) {
        if (spec.open(line, this.ctx.tip(), this.ctx)) {
          opened = true
          break
        }
      }
    }
    // 3. Consume remaining line content into the tip.
    const tail = line.raw.slice(line.cursor)
    if (tail.length === 0) return
    const tip = this.ctx.tip()
    if (tip.spec.name === 'paragraph') {
      ;(tip.data['lines'] as Array<string>).push(tail)
    } else if (tip.spec.name === 'doc') {
      // Open a paragraph and feed it.
      paragraphSpec.open(line, tip, this.ctx)
      const newTip = this.ctx.tip()
      ;(newTip.data['lines'] as Array<string>).push(tail)
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
