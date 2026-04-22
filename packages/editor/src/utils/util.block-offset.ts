import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNode} from '../node-traversal/get-node'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import type {ChildPath} from '../types/paths'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function blockOffsetToSpanSelectionPoint({
  context,
  blockOffset,
  direction,
}: {
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}) {
  const blockEntry = getNode(context, blockOffset.path)

  if (!blockEntry || !isTextBlock(context, blockEntry.node)) {
    return undefined
  }

  const block = blockEntry.node
  const blockPath = blockEntry.path

  let offsetLeft = blockOffset.offset
  let selectionPoint: {path: ChildPath; offset: number} | undefined
  let skippedInlineObject = false

  for (const child of block.children) {
    if (direction === 'forward') {
      if (!isSpan(context, child)) {
        continue
      }

      if (offsetLeft <= child.text.length) {
        selectionPoint = {
          path: [...blockPath, 'children', {_key: child._key}],
          offset: offsetLeft,
        }
        break
      }

      offsetLeft -= child.text.length

      continue
    }

    if (!isSpan(context, child)) {
      skippedInlineObject = true
      continue
    }

    if (offsetLeft === 0 && selectionPoint && !skippedInlineObject) {
      if (skippedInlineObject) {
        selectionPoint = {
          path: [...blockPath, 'children', {_key: child._key}],
          offset: 0,
        }
      }
      break
    }

    if (offsetLeft > child.text.length) {
      offsetLeft -= child.text.length
      continue
    }

    if (offsetLeft <= child.text.length) {
      selectionPoint = {
        path: [...blockPath, 'children', {_key: child._key}],
        offset: offsetLeft,
      }

      offsetLeft -= child.text.length

      if (offsetLeft !== 0) {
        break
      }
    }
  }

  return selectionPoint
}

/**
 * @public
 */
export function spanSelectionPointToBlockOffset({
  context,
  selectionPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const spanSegment = selectionPoint.path.at(-1)

  if (!isKeyedSegment(spanSegment)) {
    return undefined
  }

  const textBlock = getAncestorTextBlock(context, selectionPoint.path)

  if (!textBlock) {
    return undefined
  }

  let offset = 0

  for (const child of textBlock.node.children) {
    if (!isSpan(context, child)) {
      continue
    }

    if (child._key === spanSegment._key) {
      return {
        path: textBlock.path,
        offset: offset + selectionPoint.offset,
      }
    }

    offset += child.text.length
  }

  return undefined
}
