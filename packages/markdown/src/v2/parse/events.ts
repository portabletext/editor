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

export type BlockEvent =
  | {
      kind: 'open'
      spec: BlockKind
      data?: Record<string, unknown>
      location: SourceLoc
    }
  | {kind: 'close'; spec: BlockKind; location: SourceLoc}
  | {kind: 'inline_run'; text: string; location: SourceLoc}
  | {kind: 'verbatim_line'; text: string; location: SourceLoc}
