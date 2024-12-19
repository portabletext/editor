import {
  isKeySegment,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextSpan,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getSelectedSpans: EditorSelector<
  Array<{
    node: PortableTextSpan
    path: [KeyedSegment, 'children', KeyedSegment]
  }>
> = ({context}) => {
  if (!context.selection) {
    return []
  }

  const selectedSpans: Array<{
    node: PortableTextSpan
    path: [KeyedSegment, 'children', KeyedSegment]
  }> = []

  const startPoint = context.selection.backward
    ? context.selection.focus
    : context.selection.anchor
  const endPoint = context.selection.backward
    ? context.selection.anchor
    : context.selection.focus

  const startBlockKey = isKeySegment(startPoint.path[0])
    ? startPoint.path[0]._key
    : undefined
  const endBlockKey = isKeySegment(endPoint.path[0])
    ? endPoint.path[0]._key
    : undefined

  if (!startBlockKey || !endBlockKey) {
    return selectedSpans
  }

  const startSpanKey = isKeySegment(startPoint.path[2])
    ? startPoint.path[2]._key
    : undefined
  const endSpanKey = isKeySegment(endPoint.path[2])
    ? endPoint.path[2]._key
    : undefined

  for (const block of context.value) {
    if (!isPortableTextTextBlock(block)) {
      continue
    }

    if (block._key === startBlockKey) {
      for (const child of block.children) {
        if (!isPortableTextSpan(child)) {
          continue
        }

        if (startSpanKey && child._key === startSpanKey) {
          selectedSpans.push({
            node: child,
            path: [{_key: block._key}, 'children', {_key: child._key}],
          })

          if (startBlockKey === endBlockKey) {
            break
          }
        }

        if (endSpanKey && child._key === endSpanKey) {
          selectedSpans.push({
            node: child,
            path: [{_key: block._key}, 'children', {_key: child._key}],
          })
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
        if (!isPortableTextSpan(child)) {
          continue
        }

        if (endSpanKey && child._key === endSpanKey) {
          selectedSpans.push({
            node: child,
            path: [{_key: block._key}, 'children', {_key: child._key}],
          })
          break
        }

        selectedSpans.push({
          node: child,
          path: [{_key: block._key}, 'children', {_key: child._key}],
        })
      }

      break
    }

    if (selectedSpans.length > 0) {
      for (const child of block.children) {
        if (!isPortableTextSpan(child)) {
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
