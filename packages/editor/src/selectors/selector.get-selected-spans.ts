import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {ChildPath} from '../types/paths'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getSelectedSpans: EditorSelector<
  Array<{
    node: PortableTextSpan
    path: ChildPath
  }>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedSpans: Array<{
    node: PortableTextSpan
    path: ChildPath
  }> = []

  const startPoint = getSelectionStartPoint(snapshot)
  const endPoint = getSelectionEndPoint(snapshot)

  if (!startPoint || !endPoint) {
    return selectedSpans
  }

  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)
  const startSpanKey = getChildKeyFromSelectionPoint(startPoint)
  const endSpanKey = getChildKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return selectedSpans
  }

  const startBlockIndex = snapshot.blockIndexMap.get(startBlockKey)
  const endBlockIndex = snapshot.blockIndexMap.get(endBlockKey)

  if (startBlockIndex === undefined || endBlockIndex === undefined) {
    return selectedSpans
  }

  const slicedValue = snapshot.context.value.slice(
    startBlockIndex,
    endBlockIndex + 1,
  )

  let startBlockFound = false

  for (const block of slicedValue) {
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
