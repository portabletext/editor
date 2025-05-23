import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {isBackward} from '../types/selection'

/**
 * @public
 */
export const getSelectedSpans: EditorSelector<
  Array<{
    node: PortableTextSpan
    path: [number, number]
  }>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedSpans: Array<{
    node: PortableTextSpan
    path: [number, number]
  }> = []

  const startPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor
  const endPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.anchor
    : snapshot.context.selection.focus

  const startBlock = snapshot.context.value.at(startPoint.path[0])
  const endBlock = snapshot.context.value.at(endPoint.path[0])

  if (!startBlock || !endBlock) {
    return selectedSpans
  }

  const startBlockKey = startBlock._key
  const endBlockKey = endBlock._key

  const startChild = isTextBlock(snapshot.context, startBlock)
    ? startBlock.children.at(startPoint.path[1])
    : undefined
  const startSpanKey = isSpan(snapshot.context, startChild)
    ? startChild._key
    : undefined
  const endChild = isTextBlock(snapshot.context, endBlock)
    ? endBlock.children.at(endPoint.path[1])
    : undefined
  const endSpanKey = isSpan(snapshot.context, endChild)
    ? endChild._key
    : undefined

  let startBlockFound = false

  let blockIndex = -1
  for (const block of snapshot.context.value) {
    blockIndex++

    if (block._key === startBlock._key) {
      startBlockFound = true
    }

    if (!isTextBlock(snapshot.context, block)) {
      continue
    }

    if (block._key === startBlock._key) {
      let childIndex = -1

      for (const child of block.children) {
        childIndex++

        if (!isSpan(snapshot.context, child)) {
          continue
        }

        if (startSpanKey && child._key === startSpanKey) {
          if (startPoint.offset < child.text.length) {
            selectedSpans.push({
              node: child,
              path: [blockIndex, childIndex],
            })
          }

          if (startSpanKey === endSpanKey) {
            break
          }

          continue
        }

        if (endSpanKey && child._key === endSpanKey) {
          if (endPoint.offset > 0) {
            selectedSpans.push({
              node: child,
              path: [blockIndex, childIndex],
            })
          }
          break
        }

        if (selectedSpans.length > 0) {
          selectedSpans.push({
            node: child,
            path: [blockIndex, childIndex],
          })
        }
      }

      if (startBlockKey === endBlockKey) {
        break
      }

      continue
    }

    if (block._key === endBlockKey) {
      let childIndex = -1

      for (const child of block.children) {
        childIndex++

        if (!isSpan(snapshot.context, child)) {
          continue
        }

        if (endSpanKey && child._key === endSpanKey) {
          if (endPoint.offset > 0) {
            selectedSpans.push({
              node: child,
              path: [blockIndex, childIndex],
            })
          }
          break
        }

        selectedSpans.push({
          node: child,
          path: [blockIndex, childIndex],
        })
      }

      break
    }

    if (startBlockFound) {
      let childIndex = -1

      for (const child of block.children) {
        childIndex++

        if (!isSpan(snapshot.context, child)) {
          continue
        }

        selectedSpans.push({
          node: child,
          path: [blockIndex, childIndex],
        })
      }
    }
  }

  return selectedSpans
}
