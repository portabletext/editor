import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
import {isEmptyTextBlock} from './empty-block'

export type RoundTripMismatchDimension = 'count' | 'type' | 'text'

/**
 * The first outline divergence between a stored document and its tidied
 * copy, or `null` when the two agree. `position` is the index into the
 * compared (empty-block-filtered) sequence; a `count` mismatch has no
 * single position to point at, so it is omitted.
 */
export type RoundTripMismatch = {
  dimension: RoundTripMismatchDimension
  position?: number
}

type Node = Record<string, unknown>

const INLINE_OBJECT_SENTINEL = '\uFFFC'

/**
 * Mirrors `applyMarkdownEdit`'s `traceOrigins` outline check (same
 * mechanism that decides whether a sync trusts positions at all): block
 * count, `_type` sequence, then per-position text, checked in that
 * order so the first divergence found is the one reported. Compares
 * against `nonEmptyBlocks(stored)`, not `stored` itself: blank lines are
 * markdown's block separator, so an empty text block has no serialized
 * form and `tidied` never carries one either.
 */
export function detectRoundTripMismatch(
  stored: ReadonlyArray<PortableTextBlock>,
  tidied: ReadonlyArray<PortableTextBlock>,
  schema: EditorSchema,
): RoundTripMismatch | null {
  const nonEmptyStored = stored.filter(
    (block) => !isEmptyTextBlock(block, schema),
  )

  if (nonEmptyStored.length !== tidied.length) {
    return {dimension: 'count'}
  }

  for (let position = 0; position < nonEmptyStored.length; position++) {
    const storedNode = nonEmptyStored[position] as unknown as Node
    const tidiedNode = tidied[position] as unknown as Node
    if (storedNode['_type'] !== tidiedNode['_type']) {
      return {dimension: 'type', position}
    }
  }

  for (let position = 0; position < nonEmptyStored.length; position++) {
    const storedNode = nonEmptyStored[position] as unknown as Node
    const tidiedNode = tidied[position] as unknown as Node
    if (isTextBlock(storedNode) && isTextBlock(tidiedNode)) {
      // CommonMark trims whitespace on reparse, so text identity
      // compares trimmed text, the same as `traceOrigins`.
      if (blockText(storedNode).trim() !== blockText(tidiedNode).trim()) {
        return {dimension: 'text', position}
      }
    }
  }

  return null
}

/** The one-line fact for the Tidied tab's persistent evidence banner. */
export function formatRoundTripMismatchBanner(
  mismatch: RoundTripMismatch,
): string {
  const where =
    mismatch.position === undefined
      ? 'outline differs from stored'
      : `outline differs from stored at block ${mismatch.position + 1}`
  return `${where}: keys will not survive a sync`
}

/** The up-front rising card's full sentence. */
export function formatRoundTripMismatchCard(
  mismatch: RoundTripMismatch,
): string {
  const detail =
    mismatch.position === undefined
      ? `${mismatch.dimension} changes`
      : `${mismatch.dimension} changes at block ${mismatch.position + 1}`
  return `This document does not survive its own round trip (${detail}). Reconciliation will not trust positions: syncing any edit will mint every key fresh.`
}

/**
 * Deliberately loose, matching `traceOrigins`: any node with a
 * `children` array reconciles like a text block, custom block types
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
function blockText(block: Node): string {
  const children = block['children']
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
