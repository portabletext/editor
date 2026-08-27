import type {PortableTextSpan} from '@portabletext/schema'
import type {DecoratedRange, LeafPosition} from '../interfaces/text'

export function getTextDecorations(
  node: PortableTextSpan,
  decorations: DecoratedRange[],
): {leaf: PortableTextSpan; position?: LeafPosition}[] {
  let leaves: {leaf: PortableTextSpan; position?: LeafPosition}[] = [
    {leaf: {...node}},
  ]

  for (const dec of decorations) {
    const {
      anchor: _anchor,
      focus: _focus,
      merge: mergeDecoration,
      isRangeStart,
      isRangeEnd,
      ...rest
    } = dec
    const [start, end] =
      dec.anchor.offset <= dec.focus.offset
        ? [dec.anchor, dec.focus]
        : [dec.focus, dec.anchor]
    const next = []
    let leafEnd = 0
    const decorationStart = start.offset
    const decorationEnd = end.offset
    const merge = mergeDecoration ?? Object.assign
    // `isRangeStart`/`isRangeEnd`/`decorationStart`/`decorationEnd` are
    // `mergeRangeDecoration`'s own bookkeeping (resolved into the public
    // `isFirst`/`isLast` below); the default `Object.assign` merge applies
    // its payload directly onto the leaf, so it only ever gets `rest`.
    const mergePayload = mergeDecoration
      ? {
          ...rest,
          isRangeStart: Boolean(isRangeStart),
          isRangeEnd: Boolean(isRangeEnd),
          decorationStart,
          decorationEnd,
        }
      : rest

    for (const {leaf} of leaves) {
      const {length} = leaf.text
      const leafStart = leafEnd
      leafEnd += length

      if (decorationStart <= leafStart && leafEnd <= decorationEnd) {
        merge(leaf, mergePayload)
        next.push({leaf})
        continue
      }

      if (
        (decorationStart !== decorationEnd &&
          (decorationStart === leafEnd || decorationEnd === leafStart)) ||
        decorationStart > leafEnd ||
        decorationEnd < leafStart ||
        (decorationEnd === leafStart && leafStart !== 0)
      ) {
        next.push({leaf})
        continue
      }

      let middle = leaf
      let before: {leaf: PortableTextSpan} | undefined
      let after: {leaf: PortableTextSpan} | undefined

      if (decorationEnd < leafEnd) {
        const off = decorationEnd - leafStart
        after = {leaf: {...middle, text: middle.text.slice(off)}}
        middle = {...middle, text: middle.text.slice(0, off)}
      }

      if (decorationStart > leafStart) {
        const off = decorationStart - leafStart
        before = {leaf: {...middle, text: middle.text.slice(0, off)}}
        middle = {...middle, text: middle.text.slice(off)}
      }

      merge(middle, mergePayload)

      if (before) {
        next.push(before)
      }

      next.push({leaf: middle})

      if (after) {
        next.push(after)
      }
    }

    leaves = next
  }

  const getPending = (item: {leaf: PortableTextSpan}) =>
    (
      item.leaf as PortableTextSpan & {
        rangeDecorations?: Array<{
          rangeDecoration: unknown
          isRangeStart: boolean
          isRangeEnd: boolean
          decorationStart: number
          decorationEnd: number
        }>
      }
    ).rangeDecorations

  const fragmentBounds = leaves.map((item) => item.leaf.text.length)
  for (let i = 1; i < fragmentBounds.length; i++) {
    fragmentBounds[i]! += fragmentBounds[i - 1]!
  }

  // Splitting a leaf can leave an empty (zero-length) fragment exactly at a
  // decoration's start/end offset, immediately next to a non-empty fragment
  // starting/ending at that same offset - both would otherwise satisfy the
  // start/end condition below. Resolved in document order per decoration:
  // the first fragment claims `isFirst`, the last claims `isLast`.
  const firstStartIndex = new Map<unknown, number>()
  const lastEndIndex = new Map<unknown, number>()

  for (const [index, item] of leaves.entries()) {
    const fragmentStart = index === 0 ? 0 : fragmentBounds[index - 1]!
    const fragmentEnd = fragmentBounds[index]!

    for (const entry of getPending(item) ?? []) {
      if (
        entry.isRangeStart &&
        fragmentStart === entry.decorationStart &&
        !firstStartIndex.has(entry.rangeDecoration)
      ) {
        firstStartIndex.set(entry.rangeDecoration, index)
      }
      if (entry.isRangeEnd && fragmentEnd === entry.decorationEnd) {
        lastEndIndex.set(entry.rangeDecoration, index)
      }
    }
  }

  for (const [index, item] of leaves.entries()) {
    if (leaves.length > 1) {
      const fragmentStart = index === 0 ? 0 : fragmentBounds[index - 1]!
      const fragmentEnd = fragmentBounds[index]!
      const position: LeafPosition = {start: fragmentStart, end: fragmentEnd}

      if (index === 0) {
        position.isFirst = true
      }
      if (index === leaves.length - 1) {
        position.isLast = true
      }

      item.position = position
    }

    // `mergeRangeDecoration` (the only `merge` implementation that reads
    // `decorationStart`/`decorationEnd`) leaves these pending entries on
    // `leaf.rangeDecorations`; resolve them into the public
    // `{rangeDecoration, isFirst, isLast}` shape now that every decoration
    // has had its chance to split this leaf further.
    const pending = getPending(item)

    if (pending) {
      ;(
        item.leaf as PortableTextSpan & {rangeDecorations?: unknown}
      ).rangeDecorations = pending.map((entry) => ({
        rangeDecoration: entry.rangeDecoration,
        isFirst: firstStartIndex.get(entry.rangeDecoration) === index,
        isLast: lastEndIndex.get(entry.rangeDecoration) === index,
      }))
    }
  }

  return leaves
}
