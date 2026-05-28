/**
 * Serializer for `@portabletext/markdown` v2 (spike).
 *
 * Recursive walk over a PT array, emitting markdown directly. Dispatches on
 * `_type` and (for text blocks) `style` / `listItem`.
 *
 * Spike scope: paragraph, heading (h1-h6), fenced code (`code` block-object),
 * thematic break (`horizontal-rule`), blockquote (flat path), bullet/ordered
 * list (flat path). Inline: strong/em/code/link.
 *
 * The block-spacing rules (spec §6) are owned here: the serializer joins
 * blocks with the right gap based on what's adjacent.
 *
 * @internal
 */

import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'

type PtNode = PortableTextBlock | PortableTextObject

export function serializeToMarkdown(blocks: ReadonlyArray<PtNode>): string {
  const out: Array<string> = []
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    if (!block) continue
    const rendered = renderBlock(block)
    if (i === blocks.length - 1) {
      out.push(rendered)
      continue
    }
    const next = blocks[i + 1]
    out.push(rendered)
    out.push(spacing(block, next))
  }
  return out.join('')
}

function spacing(current: PtNode, next: PtNode | undefined): string {
  if (!next) return ''
  if (isListItem(current) && isListItem(next)) {
    if (
      (current as PortableTextTextBlock).listItem ===
      (next as PortableTextTextBlock).listItem
    ) {
      return '\n'
    }
    return '\n'
  }
  if (isBlockquoteFlat(current) && isBlockquoteFlat(next)) {
    return '\n>\n'
  }
  return '\n\n'
}

function renderBlock(block: PtNode): string {
  if (block._type === 'block') {
    return renderTextBlock(block as PortableTextTextBlock)
  }
  if (block._type === 'horizontal-rule') {
    return '---'
  }
  if (block._type === 'code') {
    const v = block as unknown as {language?: string; code: string}
    return `\`\`\`${v.language ?? ''}\n${v.code}\n\`\`\``
  }
  // Unknown block-object: fall back to fenced JSON. Keeps the round-trip
  // signal honest while we surface "what is this?" to the consumer.
  return `\`\`\`json\n${JSON.stringify(block, null, 2)}\n\`\`\``
}

function renderTextBlock(block: PortableTextTextBlock): string {
  const inline = renderChildren(block.children ?? [], block.markDefs ?? [])
  const style = block.style ?? 'normal'

  if (block.listItem) {
    const level = block.level ?? 1
    const indent = '   '.repeat(level - 1)
    if (block.listItem === 'number') {
      return `${indent}1. ${inline}`
    }
    return `${indent}- ${inline}`
  }

  if (style === 'normal') return inline
  if (style === 'blockquote') {
    return inline
      .split('\n')
      .map((line) => (line === '' ? '>' : `> ${line}`))
      .join('\n')
  }
  if (/^h[1-6]$/.test(style)) {
    const level = Number.parseInt(style.slice(1), 10)
    return `${'#'.repeat(level)} ${inline}`
  }
  return inline
}

function renderChildren(
  children: ReadonlyArray<PortableTextSpan | unknown>,
  markDefs: ReadonlyArray<{
    _type: string
    _key: string
    href?: string
    title?: string
  }>,
): string {
  let out = ''
  // We treat decorators as immediate wrappers; annotations look up markDefs.
  // The simplest correct strategy is to emit each span with all its marks
  // applied in source order. v1 uses `buildMarksTree` from
  // `@portabletext/toolkit`; for the spike we inline a minimal tree builder.
  const tree = buildMarksTree(children as ReadonlyArray<PortableTextSpan>)
  for (const node of tree) {
    out += renderInline(node, markDefs)
  }
  return out
}

type InlineTree =
  | {kind: 'text'; text: string}
  | {kind: 'mark'; mark: string; children: Array<InlineTree>}

function buildMarksTree(
  spans: ReadonlyArray<PortableTextSpan>,
): Array<InlineTree> {
  const nodes: Array<InlineTree> = []
  let currentParent = nodes
  const parentStack: Array<Array<InlineTree>> = [nodes]
  const markStack: Array<string> = []

  for (const span of spans) {
    if (span._type !== 'span') continue
    const spanMarks = span.marks ?? []

    // Pop marks no longer active.
    let commonLen = 0
    while (
      commonLen < markStack.length &&
      commonLen < spanMarks.length &&
      markStack[commonLen] === spanMarks[commonLen]
    ) {
      commonLen += 1
    }
    while (markStack.length > commonLen) {
      markStack.pop()
      parentStack.pop()
      currentParent = parentStack[parentStack.length - 1] ?? nodes
    }
    // Push new marks.
    for (let i = commonLen; i < spanMarks.length; i += 1) {
      const m = spanMarks[i] ?? ''
      const node: InlineTree = {kind: 'mark', mark: m, children: []}
      currentParent.push(node)
      currentParent = node.children
      parentStack.push(node.children)
      markStack.push(m)
    }
    currentParent.push({kind: 'text', text: span.text})
  }
  return nodes
}

function renderInline(
  node: InlineTree,
  markDefs: ReadonlyArray<{
    _type: string
    _key: string
    href?: string
    title?: string
  }>,
): string {
  if (node.kind === 'text') return node.text
  const inner = node.children.map((c) => renderInline(c, markDefs)).join('')
  const m = node.mark
  if (m === 'strong') return `**${inner}**`
  if (m === 'em') return `_${inner}_`
  if (m === 'code') return `\`${inner}\``
  if (m === 'strike-through') return `~~${inner}~~`
  // Annotation: look up markDef
  const def = markDefs.find((d) => d._key === m)
  if (def?._type === 'link') {
    const title = def.title ? ` "${def.title}"` : ''
    return `[${inner}](${def.href ?? ''}${title})`
  }
  return inner
}

function isListItem(b: PtNode): boolean {
  return b._type === 'block' && Boolean((b as PortableTextTextBlock).listItem)
}

function isBlockquoteFlat(b: PtNode): boolean {
  return (
    b._type === 'block' && (b as PortableTextTextBlock).style === 'blockquote'
  )
}
