/**
 * Block parser event stream for the BlockSpec-driven parser.
 *
 * Events are emitted by `BlockParser` in document order and consumed by
 * `eventsToPortableText` to build the final PT tree. `open`/`close`
 * events come in matching pairs that nest correctly per the container
 * stack. `inline_run` carries text-bearing leaf content that the inline
 * lexer parses; `verbatim_line` carries literal lines (code blocks,
 * indented code, html blocks).
 *
 * See /specs/portabletext-markdown-v2-lazy-continuation.md §3.2.
 *
 * @internal
 */

export type BlockKind =
  | 'doc'
  | 'paragraph'
  | 'heading'
  | 'thematic_break'
  | 'blockquote'
  | 'list'
  | 'list_item'
  | 'code_block'
  | 'fenced_code'
  | 'html_block'
  | 'table_row'
  | 'callout'

export interface SourceLoc {
  line: number
  column: number
}

/**
 * Per-spec data carried on `open` events. Each field is populated by one
 * spec only; the wide shape avoids a discriminated union with a per-kind
 * generic on `BlockEvent`.
 */
export interface BlockEventData {
  /** `heading`: 1-6. */
  level?: number
  /** `heading`: raw text after `#`s. */
  text?: string
  /** `list`: marker kind. */
  kind?: 'bullet' | 'number' | 'task'
  /** `list_item`: marker character(s) (`-`, `*`, `+`, or `1.` etc). */
  marker?: string
  /** `list_item`: task-list checkbox state. */
  checked?: boolean
  /** `fenced_code`: language tag after the opening fence. */
  lang?: string
  /** `table_row`: raw row text (kept verbatim through the event stream). */
  raw?: string
}

export type BlockEvent =
  | {
      kind: 'open'
      spec: BlockKind
      data?: BlockEventData
      location: SourceLoc
    }
  | {kind: 'close'; spec: BlockKind; location: SourceLoc}
  | {kind: 'inline_run'; text: string; location: SourceLoc}
  | {kind: 'verbatim_line'; text: string; location: SourceLoc}
