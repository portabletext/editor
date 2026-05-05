import {isSpan, isTextBlock} from '@portabletext/schema'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNode} from '../node-traversal/get-node'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import type {ChildPath} from '../types/paths'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function blockOffsetToSpanSelectionPoint({
  snapshot,
  blockOffset,
  direction,
}: {
  snapshot: TraversalSnapshot
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}) {
  const blockEntry = getNode(snapshot, blockOffset.path)

  if (!blockEntry || !isTextBlock(snapshot.context, blockEntry.node)) {
    return undefined
  }

  const block = blockEntry.node
  const blockPath = blockEntry.path

  let offsetLeft = blockOffset.offset
  let selectionPoint: {path: ChildPath; offset: number} | undefined
  let skippedInlineObject = false

  for (const child of block.children) {
    if (direction === 'forward') {
      if (!isSpan(snapshot.context, child)) {
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

    if (!isSpan(snapshot.context, child)) {
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
  snapshot,
  selectionPoint,
}: {
  snapshot: TraversalSnapshot
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const spanSegment = selectionPoint.path.at(-1)

  if (!isKeyedSegment(spanSegment)) {
    return undefined
  }

  const textBlock = getAncestorTextBlock(snapshot, selectionPoint.path)

  if (!textBlock) {
    return undefined
  }

  let offset = 0

  for (const child of textBlock.node.children) {
    if (!isSpan(snapshot.context, child)) {
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
