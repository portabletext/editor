/**
 * Serializer for `@portabletext/markdown` v2 (spike).
 *
 * Recursive walk over a PT array, emitting markdown directly. Dispatches on
 * `_type` and (for text blocks) `style` / `listItem`. Block-object kinds
 * (code, image, hr, table, callout, blockquote-as-object, list-as-object)
 * route through the v1 `Default*Renderer` exports for the spike. As v2's
 * own per-node print functions land they replace the v1 calls one-for-one.
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
import {escapeImageAndLinkText, escapeImageAndLinkTitle} from '../../escape'
import {DefaultListItemRenderer} from '../../from-portable-text/renderers/list-item'
import {
  DefaultBlockquoteObjectRenderer,
  DefaultCalloutRenderer,
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultHtmlRenderer,
  DefaultImageRenderer,
  DefaultListRenderer,
  DefaultTableRenderer,
} from '../../from-portable-text/renderers/type'
import type {RenderNode} from '../../from-portable-text/types'

type PtNode = PortableTextBlock | PortableTextObject

export function serializeToMarkdown(blocks: ReadonlyArray<PtNode>): string {
  const out: Array<string> = []
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    if (!block) {
      continue
    }
    const rendered = renderBlock(block, i, blocks)
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
  if (!next) {
    return ''
  }
  if (isListItem(current) && isListItem(next)) {
    return '\n'
  }
  if (isBlockquoteFlat(current) && isBlockquoteFlat(next)) {
    return '\n>\n'
  }
  return '\n\n'
}

function renderBlock(
  block: PtNode,
  index: number,
  blocks: ReadonlyArray<PtNode>,
): string {
  if (block._type === 'block') {
    return renderTextBlock(block as PortableTextTextBlock, index)
  }
  const renderNode = makeRenderNodeForChildren(blocks)
  if (block._type === 'horizontal-rule') {
    return DefaultHorizontalRuleRenderer({
      value: block,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'code') {
    return DefaultCodeBlockRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'image') {
    return DefaultImageRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'html') {
    return DefaultHtmlRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'table') {
    return DefaultTableRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'callout') {
    return DefaultCalloutRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'blockquote') {
    return DefaultBlockquoteObjectRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  if (block._type === 'list') {
    return DefaultListRenderer({
      value: block as never,
      index,
      isInline: false,
      renderNode,
    })
  }
  // Unknown block-object: fall back to fenced JSON. Keeps the round-trip
  // signal honest while we surface "what is this?" to the consumer.
  return `\`\`\`json\n${JSON.stringify(block, null, 2)}\n\`\`\``
}

// renderNode passed to v1 renderers so they can recursively render nested
// content (e.g. blockquote.content, callout.content, list.items.content,
// table.rows.cells.value). For a single-level dispatch, the renderer
// receives this thunk and routes back through serializeToMarkdown.
function makeRenderNodeForChildren(_blocks: ReadonlyArray<PtNode>): RenderNode {
  const renderNode: RenderNode = (opts) => {
    return renderBlock(opts.node as unknown as PtNode, opts.index, [
      opts.node as unknown as PtNode,
    ])
  }
  return renderNode
}

function renderTextBlock(block: PortableTextTextBlock, index: number): string {
  const inline = renderChildren(block.children ?? [], block.markDefs ?? [])
  const style = block.style ?? 'normal'

  if (block.listItem) {
    return DefaultListItemRenderer({
      value: block as never,
      index,
      listIndex:
        typeof (block as PortableTextTextBlock & {_listIndex?: number})
          ._listIndex === 'number'
          ? (block as PortableTextTextBlock & {_listIndex?: number})._listIndex
          : index + 1,
      isInline: false,
      renderNode: (() => '') as never,
      children: inline,
    })
  }

  if (style === 'normal') {
    return inline
  }
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
    if (span._type !== 'span') {
      continue
    }
    const spanMarks = span.marks ?? []

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
  if (node.kind === 'text') {
    // Portable Text represents both soft and hard breaks as a literal `\n`
    // in the span text. Markdown's hard-break syntax is two trailing spaces
    // + newline, so we substitute on the way out.
    return node.text.replace(/\n/g, '  \n')
  }
  const inner = node.children.map((c) => renderInline(c, markDefs)).join('')
  const m = node.mark
  if (m === 'strong') {
    return `**${inner}**`
  }
  if (m === 'em') {
    return `_${inner}_`
  }
  if (m === 'code') {
    return `\`${inner}\``
  }
  if (m === 'strike-through') {
    return `~~${inner}~~`
  }
  const def = markDefs.find((d) => d._key === m)
  if (def?._type === 'link') {
    const text = escapeImageAndLinkText(inner)
    const title = def.title ? ` "${escapeImageAndLinkTitle(def.title)}"` : ''
    return `[${text}](${def.href ?? ''}${title})`
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
