import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'

type Node = Record<string, unknown>

const INLINE_OBJECT_SENTINEL = '\uFFFC'

/**
 * Mirrors `apply-markdown-edit.ts`'s `isEmptyTextBlock`. Whitespace-only
 * text alone is not enough evidence: an empty heading still renders
 * `## ` and survives the round trip, while an empty plain paragraph
 * renders nothing and does not. The block's own render-then-reparse is
 * the authority the round trip itself uses, so this predicate cannot
 * disagree with the canonical node count.
 */
export function isEmptyTextBlock(
  block: PortableTextBlock,
  schema: EditorSchema,
): boolean {
  const node = block as unknown as Node
  if (!isTextBlock(node) || blockText(node).trim() !== '') {
    return false
  }
  const rendered = portableTextToMarkdown([block], {schema})
  if (rendered === '') {
    return true
  }
  let probeKeyCounter = 0
  return (
    markdownToPortableText(rendered, {
      schema,
      keyGenerator: () => `empty-probe-${probeKeyCounter++}`,
    }).length === 0
  )
}

/**
 * Deliberately loose, matching `apply-markdown-edit.ts`: any node with
 * a `children` array reconciles like a text block, custom block types
 * included.
 */
function isTextBlock(node: Node): boolean {
  return Array.isArray(node['children'])
}

/**
 * The block's comparison text: concatenated span text with inline
 * objects as sentinels. Marks are ignored, since a formatting-only
 * edit does not change textual identity.
 */
function blockText(node: Node): string {
  const children = node['children']
  if (!isTypedObjectArray(children)) {
    return ''
  }
  return children
    .map((child) =>
      typeof child['text'] === 'string'
        ? child['text']
        : INLINE_OBJECT_SENTINEL,
    )
    .join('')
}

function isTypedObjectArray(value: unknown): value is Array<Node> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Node)['_type'] === 'string',
    )
  )
}
