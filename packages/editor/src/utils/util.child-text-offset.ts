/**
 * Pure text-offset arithmetic over a node's children array, shared by
 * the snapshot-aware block-offset utils (`util.block-offset.ts`) and
 * the schema-free point transform (`engine/point/transform-point.ts`).
 * Span-ness is the caller's concern, expressed as an accessor that
 * returns the child's text when the child occupies text offsets and
 * `undefined` when it does not (inline objects, blocks).
 */

/**
 * The text offset of `(childKey, offsetInChild)` within `children`:
 * the total text of the children before that child, plus the offset
 * into it. `undefined` when the child is missing or carries no text.
 */
export function textOffsetOfChild(
  children: ReadonlyArray<unknown>,
  getSpanText: (child: unknown) => string | undefined,
  childKey: string,
  offsetInChild: number,
): number | undefined {
  let precedingTextLength = 0

  for (const child of children) {
    const text = getSpanText(child)
    if (keyOf(child) === childKey) {
      return text === undefined
        ? undefined
        : precedingTextLength + offsetInChild
    }
    if (text !== undefined) {
      precedingTextLength += text.length
    }
  }

  return undefined
}

/**
 * The child and child-local offset at `textOffset` within `children`.
 * Forward-boundary convention: an offset landing exactly on a span
 * boundary stays at the end of the earlier span. `undefined` when the
 * offset lies beyond the children's total text.
 */
export function childAtTextOffset(
  children: ReadonlyArray<unknown>,
  getSpanText: (child: unknown) => string | undefined,
  textOffset: number,
): {key: string; offset: number} | undefined {
  let remainingOffset = textOffset

  for (const child of children) {
    const text = getSpanText(child)
    if (text === undefined) {
      continue
    }
    if (remainingOffset <= text.length) {
      const key = keyOf(child)
      return key === undefined ? undefined : {key, offset: remainingOffset}
    }
    remainingOffset -= text.length
  }

  return undefined
}

function keyOf(child: unknown): string | undefined {
  if (child !== null && typeof child === 'object' && '_key' in child) {
    const key = (child as {_key: unknown})._key
    return typeof key === 'string' ? key : undefined
  }
  return undefined
}
