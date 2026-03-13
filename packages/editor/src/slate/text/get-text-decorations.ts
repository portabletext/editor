import type {DecoratedRange, LeafPosition, Text} from '../interfaces/text'
import {rangeEdges} from '../range/range-edges'

export function getTextDecorations(
  node: Text,
  decorations: DecoratedRange[],
): {leaf: Text; position?: LeafPosition}[] {
  let leaves: {leaf: Text; position?: LeafPosition}[] = [{leaf: {...node}}]

  for (const dec of decorations) {
    const {
      anchor: _anchor,
      focus: _focus,
      merge: mergeDecoration,
      ...rest
    } = dec
    const [start, end] = rangeEdges(dec)
    const next = []
    let leafEnd = 0
    const decorationStart = start.offset
    const decorationEnd = end.offset
    const merge = mergeDecoration ?? Object.assign

    for (const {leaf} of leaves) {
      const {length} = leaf.text
      const leafStart = leafEnd
      leafEnd += length

      if (decorationStart <= leafStart && leafEnd <= decorationEnd) {
        merge(leaf, rest)
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
      let before: {leaf: Text} | undefined
      let after: {leaf: Text} | undefined

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

      merge(middle, rest)

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

  if (leaves.length > 1) {
    let currentOffset = 0
    for (const [index, item] of leaves.entries()) {
      const start = currentOffset
      const end = start + item.leaf.text.length
      const position: LeafPosition = {start, end}

      if (index === 0) {
        position.isFirst = true
      }
      if (index === leaves.length - 1) {
        position.isLast = true
      }

      item.position = position
      currentOffset = end
    }
  }

  return leaves
}
