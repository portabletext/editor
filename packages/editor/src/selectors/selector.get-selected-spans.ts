import type {KeyedSegment, PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getSelectedSpans: EditorSelector<
  Array<{
    node: PortableTextSpan
    path: [KeyedSegment, 'children', KeyedSegment]
  }>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedSpans: Array<{
    node: PortableTextSpan
    path: [KeyedSegment, 'children', KeyedSegment]
  }> = []

  const startPoint = getSelectionStartPoint(snapshot)
  const endPoint = getSelectionEndPoint(snapshot)

  if (!startPoint || !endPoint) {
    return selectedSpans
  }

  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return selectedSpans
  }

  const startSpanKey = getChildKeyFromSelectionPoint(startPoint)
  const endSpanKey = getChildKeyFromSelectionPoint(endPoint)

  let startBlockFound = false

  for (const block of snapshot.context.value) {
    if (block._key === startBlockKey) {
      startBlockFound = true
    }

    if (!isTextBlock(snapshot.context, block)) {
      continue
    }

    if (block._key === startBlockKey) {
      for (const child of block.children) {
        if (!isSpan(snapshot.context, child)) {
          continue
        }

        if (startSpanKey && child._key === startSpanKey) {
          if (startPoint.offset < child.text.length) {
            selectedSpans.push({
              node: child,
              path: [{_key: block._key}, 'children', {_key: child._key}],
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
              path: [{_key: block._key}, 'children', {_key: child._key}],
            })
          }
          break
        }

        if (selectedSpans.length > 0) {
          selectedSpans.push({
            node: child,
            path: [{_key: block._key}, 'children', {_key: child._key}],
          })
        }
      }

      if (startBlockKey === endBlockKey) {
        break
      }

      continue
    }

    if (block._key === endBlockKey) {
      for (const child of block.children) {
        if (!isSpan(snapshot.context, child)) {
          continue
        }

        if (endSpanKey && child._key === endSpanKey) {
          if (endPoint.offset > 0) {
            selectedSpans.push({
              node: child,
              path: [{_key: block._key}, 'children', {_key: child._key}],
            })
          }
          break
        }

        selectedSpans.push({
          node: child,
          path: [{_key: block._key}, 'children', {_key: child._key}],
        })
      }

      break
    }

    if (startBlockFound) {
      for (const child of block.children) {
        if (!isSpan(snapshot.context, child)) {
          continue
        }

        selectedSpans.push({
          node: child,
          path: [{_key: block._key}, 'children', {_key: child._key}],
        })
      }
    }
  }

  return selectedSpans
}
